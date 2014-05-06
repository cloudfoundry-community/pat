package benchmarker

import (
	"errors"
	"io"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/cloudfoundry-incubator/pat/context"
	"github.com/cloudfoundry-incubator/pat/redis"
	"github.com/cloudfoundry-incubator/pat/workloads"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
)

var _ = Describe("RedisWorker", func() {
	var (
		conn redis.Conn		
		workloadCtx = context.WorkloadContext(context.NewWorkloadContent())
	)

	BeforeEach(func() {	
		StartRedis("../redis/redis.conf")
		var err error
		conn, err = redis.Connect("", 63798, "p4ssw0rd")
		Ω(err).ShouldNot(HaveOccurred())
	})

	AfterEach(func() {
		StopRedis()
	})

	Describe("When a single experiment is provided", func() {
		Context("When no slaves are running", func() {
			It("Times out after a specified time", func() {
				worker := NewRedisWorkerWithTimeout(conn, 1)
				worker.AddWorkloadStep(workloads.Step("timesout", func() error { time.Sleep(10 * time.Second); return nil }, ""))

				result := make(chan error)
				go func() {
					result <- worker.Time("timesout", workloadCtx).Error
				}()

				Eventually(result, 2).Should(Receive())				
			})			
		})

		Context("When a slave is running", func() {
			var (
				slave    io.Closer
				delegate *LocalWorker
				localContext  context.WorkloadContext
				wasCalledWithWorkerIndex int
				wasCalledWithWorkerUsername string
				wasCalledWithRandomKey string
				wasCalledWithIntTypeKey int
				wasCalledWithInt64TypeKey int64
				wasCalledWithBoolTypeKey bool
			)

			JustBeforeEach(func() {
				delegate = NewLocalWorker()
				delegate.AddWorkloadStep(workloads.Step("stepWithError", func() error { return errors.New("Foo") }, ""))
				delegate.AddWorkloadStep(workloads.Step("foo", func() error { time.Sleep(1 * time.Second); return nil }, ""))
				delegate.AddWorkloadStep(workloads.Step("bar", func() error { time.Sleep(2 * time.Second); return nil }, ""))

				localContext = context.WorkloadContext(context.NewWorkloadContent())
				delegate.AddWorkloadStep(workloads.StepWithContext("fooWithContext", func(ctx context.WorkloadContext) error { localContext = ctx; ctx.PutInt("a", 1); return nil }, ""))
				delegate.AddWorkloadStep(workloads.StepWithContext("barWithContext", func(ctx context.WorkloadContext) error { ctx.PutInt("a", ctx.GetInt("a") + 2); return nil }, ""))
				delegate.AddWorkloadStep(workloads.StepWithContext("recordWorkerIndex", func(ctx context.WorkloadContext) error { wasCalledWithWorkerIndex = ctx.GetInt("workerIndex"); return nil }, ""))
				delegate.AddWorkloadStep(workloads.StepWithContext("recordWorkerUsername", func(ctx context.WorkloadContext) error { wasCalledWithWorkerUsername = ctx.GetString("cfUsername"); return nil }, ""))
				delegate.AddWorkloadStep(workloads.StepWithContext("recordWorkerInfo", func(ctx context.WorkloadContext) error { wasCalledWithRandomKey = ctx.GetString("RandomKey"); wasCalledWithWorkerUsername = ctx.GetString("cfUsername"); return nil }, ""))
				delegate.AddWorkloadStep(workloads.StepWithContext("recordWorkerInt", func(ctx context.WorkloadContext) error { wasCalledWithIntTypeKey = ctx.GetInt("intTypeKey"); return nil }, ""))
				delegate.AddWorkloadStep(workloads.StepWithContext("recordWorkerInt64", func(ctx context.WorkloadContext) error { wasCalledWithInt64TypeKey = ctx.GetInt64("int64TypeKey"); return nil }, ""))
				delegate.AddWorkloadStep(workloads.StepWithContext("recordWorkerBool", func(ctx context.WorkloadContext) error { wasCalledWithBoolTypeKey = ctx.GetBool("boolTypeKey"); return nil }, ""))


				slave = StartSlave(conn, delegate)
				workloadCtx = context.WorkloadContext(context.NewWorkloadContent())
				workloadCtx.PutInt("workerIndex" ,0)

			})

			AfterEach(func() {
				err := slave.Close()
				Ω(err).ShouldNot(HaveOccurred())
			})

			It("passes workerIndex to delegate.Time()", func() {	
				worker := NewRedisWorkerWithTimeout(conn, 1)
				workloadCtx.PutInt("workerIndex", 72)
				worker.Time("recordWorkerIndex", workloadCtx);
				Ω(wasCalledWithWorkerIndex).Should(Equal(72))
			})

			It("Times a function by name", func() {				
				worker := NewRedisWorkerWithTimeout(conn, 1)				
				result := worker.Time("foo", workloadCtx)
				Ω(result.Error).Should(BeNil())
				Ω(result.Duration.Seconds()).Should(BeNumerically("~", 1, 0.1))
			})

			It("Sets the function command name in the response struct", func() {				
				worker := NewRedisWorker(conn)
				result := worker.Time("foo", workloadCtx)
				Ω(result.Steps[0].Command).Should(Equal("foo"))
			})

			It("Returns any errors", func() {				
				worker := NewRedisWorker(conn)
				result := worker.Time("stepWithError", workloadCtx)
				Ω(result.Error).Should(HaveOccurred())
			})

			It("Passes workload context to each step", func() {				
				worker := NewRedisWorker(conn)
				worker.Time("fooWithContext,barWithContext", workloadCtx)
				Ω(localContext.CheckExists("a")).Should(Equal(true))
			})			

			Describe("When multiple steps are provided separated by commas", func() {
				var result IterationResult

				JustBeforeEach(func() {
					worker := NewRedisWorkerWithTimeout(conn, 5)
					result = worker.Time("foo,bar", workloadCtx)
					Ω(result.Error).Should(BeNil())
				})

				It("Reports the total time", func() {
					Ω(result.Duration.Seconds()).Should(BeNumerically("~", 3, 0.1))
				})

				It("Records each step seperately", func() {
					Ω(result.Steps).Should(HaveLen(2))
					Ω(result.Steps[0].Command).Should(Equal("foo"))
					Ω(result.Steps[1].Command).Should(Equal("bar"))
				})

				It("Times each step seperately", func() {
					Ω(result.Steps).Should(HaveLen(2))
					Ω(result.Steps[0].Duration.Seconds()).Should(BeNumerically("~", 1, 0.1))
					Ω(result.Steps[1].Duration.Seconds()).Should(BeNumerically("~", 2, 0.1))
				})				
			})

			Describe("Workload context map sending over Redis", func() {

				AfterEach(func() {
					workloadCtx = context.NewWorkloadContent()
				})

				Describe("Contents in the context map", func() {
					It("should send all the keys in the context over redis", func() {
						worker := NewRedisWorker(conn)
						workloadCtx.PutString("cfUsername", "user1")
						workloadCtx.PutString("RandomKey", "some info")
						_ = worker.Time("recordWorkerInfo", workloadCtx)
						Ω(wasCalledWithWorkerUsername).Should(Equal("user1"))
						Ω(wasCalledWithRandomKey).Should(Equal("some info"))
					})

					It("should retain 'int' type content when sending over redis", func() {
						worker := NewRedisWorker(conn)						
						workloadCtx.PutInt("intTypeKey", 100)
						_ = worker.Time("recordWorkerInt", workloadCtx)					
						Ω(wasCalledWithIntTypeKey).Should(Equal(100))
					})

					It("should retain 'bool' type content when sending over redis", func() {
						worker := NewRedisWorker(conn)						
						workloadCtx.PutBool("boolTypeKey", true)
						_ = worker.Time("recordWorkerBool", workloadCtx)					
						Ω(wasCalledWithBoolTypeKey).Should(Equal(true))
					})

					It("should retain 'int64' type content when sending over redis", func() {
						var i int64
						i = 50
						worker := NewRedisWorker(conn)						
						workloadCtx.PutInt64("int64TypeKey", i)
						_ = worker.Time("recordWorkerInt64", workloadCtx)					
						Ω(wasCalledWithInt64TypeKey).Should(Equal(int64(50)))
					})
				})
				
				Describe("When content string contain spaces", func() {
					It("should run on slave worker with no errors", func() {					
						worker := NewRedisWorker(conn)
						workloadCtx.PutString("cfPassword", "pass1, pass2, pass3")
						result := worker.Time("foo", workloadCtx)			
						Ω(result.Error).Should(BeNil())					
					})

					It("should retain all the spaces in content while passing over redis", func() {					
						worker := NewRedisWorker(conn)
						workloadCtx.PutString("cfUsername", " user1, user2, user3 ")
						_ = worker.Time("recordWorkerUsername", workloadCtx)			
						Ω(wasCalledWithWorkerUsername).Should(Equal(" user1, user2, user3 "))
					})
				})
			})			
		})
	})
	
})

func StartRedis(config string) {
	_, filename, _, _ := runtime.Caller(0)
	dir, _ := filepath.Abs(filepath.Dir(filename))
	StopRedis()
	exec.Command("redis-server", dir+"/"+config).Run()
	time.Sleep(450 * time.Millisecond) // yuck(jz)
}

func StopRedis() {
	exec.Command("redis-cli", "-p", "63798", "shutdown").Run()
	exec.Command("redis-cli", "-p", "63798", "-a", "p4ssw0rd", "shutdown").Run()
}
