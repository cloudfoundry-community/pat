package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/julz/pat/benchmarker"
	. "github.com/julz/pat/experiment"
	"github.com/julz/pat/experiments"
	. "github.com/julz/pat/laboratory"
	"github.com/julz/pat/store"
)

type Response struct {
	TotalTime int64
	Timestamp int64
}

type context struct {
	router *mux.Router
	lab    Laboratory
}

func Serve() {
	ServeWithArgs("output/csvs")
}

func ServeWithArgs(csvDir string) {
	ServeWithLab(NewLaboratory(store.NewCsvStore(csvDir)), csvDir)
}

func ServeWithLab(lab Laboratory, csvDir string) {
	r := mux.NewRouter()
	ctx := &context{r, lab}

	r.Methods("GET").Path("/experiments/").HandlerFunc(handler(ctx.handleListExperiments))
	r.Methods("GET").Path("/experiments/{name}").HandlerFunc(handler(ctx.handleGetExperiment)).Name("experiment")
	r.Methods("POST").Path("/experiments/").HandlerFunc(handler(ctx.handlePush))

	http.Handle("/ui/", http.StripPrefix("/ui/", http.FileServer(http.Dir("ui"))))
	http.Handle("/csv/experiments/", http.StripPrefix("/csv/experiments/", http.FileServer(http.Dir(csvDir))))
	http.Handle("/", r)
}

func Bind() {
	fmt.Println("Starting web ui on http://localhost:8080/ui/")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Printf("ListenAndServe: %s\n", err)
	}
}

type listResponse struct {
	Items interface{}
}

func (ctx *context) handleListExperiments(w http.ResponseWriter, r *http.Request) (interface{}, error) {
	experiments := make([]map[string]string, 0)
	ctx.lab.Visit(func(e Experiment) {
		json := make(map[string]string)
		url, _ := ctx.router.Get("experiment").URL("name", e.GetGuid())
		csvUrl := fmt.Sprintf("/csv/%v.csv", url.String())
		json["Location"] = url.String()
		json["CsvLocation"] = csvUrl
		json["Name"] = "Simple Push"
		json["State"] = "Unknown"
		experiments = append(experiments, json)
	})

	return &listResponse{experiments}, nil
}

func (ctx *context) handlePush(w http.ResponseWriter, r *http.Request) (interface{}, error) {
	pushes, err := strconv.Atoi(r.FormValue("iterations"))
	if err != nil {
		pushes = 1
	}

	concurrency, err := strconv.Atoi(r.FormValue("concurrency"))
	if err != nil {
		concurrency = 1
	}

	workload := r.FormValue("workload")
	if workload == "" {
		workload = "push"
	}

	//ToDo (simon): interval and stop is 0, repeating at interval is not yet exposed in Web UI
	worker := benchmarker.NewWorker()
	worker.AddExperiment("push", experiments.Dummy)
	experiment, _ := ctx.lab.Run(NewRunnableExperiment(NewExperimentConfiguration(pushes, concurrency, 0, 0, worker, workload)))

	return ctx.router.Get("experiment").URL("name", experiment.GetGuid())
}

func (ctx *context) handleGetExperiment(w http.ResponseWriter, r *http.Request) (interface{}, error) {
	name := mux.Vars(r)["name"]
	// TODO(jz) only send back since N
	data, err := ctx.lab.GetData(name)
	return &listResponse{data}, err
}

func handler(fn func(w http.ResponseWriter, r *http.Request) (interface{}, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var err error
		var response interface{}
		var encoded []byte

		if response, err = fn(w, r); err == nil {
			switch r := response.(type) {
			case *url.URL:
				w.Header().Set("Location", r.String())
				w.Header().Set("Content-Type", "application/json")
				fmt.Fprintf(w, "{ \"Location\": \"%v\", \"CsvLocation\": \"/csv/%v.csv\" }", r, r)
				return
			default:
				if encoded, err = json.Marshal(r); err == nil {
					w.Header().Set("Content-Type", "application/json")
					fmt.Fprintf(w, string(encoded))
					return
				}
			}
		}

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}
