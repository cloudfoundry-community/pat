describe("Workload List", function(){
  var workloadList = new patWorkload();
  ko.applyBindings(workloadList, document.getElementById("workloadModelTest"))

  beforeEach(function(){
    workloadList.selectedCmds.removeAll();

    workloadList.reqArguments().forEach(function(d){
      d.display("none")
    })
  })

  it("draws a button for each workload command", function(){    
    for (var i=0; i<workloadList.availableCmds().length; i++) {       
      expect( $("#workloadItems").find("button")[i].textContent.trim() ).toBe(workloadList.availableCmds()[i].name)      
    }
  })

  it("returns 'true' for showing selected workload caption if any workload is selected", function(){
    expect(workloadList.shouldShowSelectedCaption() ).toBe(false)

    var cmd = "dummy"
    $("#workloadItems button:contains(" + cmd + ")").trigger("click") 
    
    expect(workloadList.shouldShowSelectedCaption() ).toBe(true)
    expect(workloadList.shouldShowArgumentCaption() ).toBe(false)
  })

  it("returns 'false' for showing selected workload caption if all workload is removed", function(){    
    var cmd = "dummy"
    $("#workloadItems button:contains(" + cmd + ")").trigger("click") 
    expect(workloadList.shouldShowSelectedCaption() ).toBe(true)
    
    $("#selectedList button:contains(" + cmd + ")").trigger("click") 
    expect(workloadList.shouldShowArgumentCaption() ).toBe(false)    
  })

  it("returns 'true' for showing argument caption if any argument input is required", function(){
    expect(workloadList.shouldShowArgumentCaption() ).toBe(false)

    var cmd = "rest:target"
    $("#workloadItems button:contains(" + cmd + ")").trigger("click") 
    
    expect(workloadList.shouldShowArgumentCaption() ).toBe(true)
  })
  
  it("removes a selected command when user click on the selected command button", function(){    
    var cmd = "rest:target"

    $("#workloadItems button:contains(" + cmd + ")").trigger("click") 
    expect( $("#selectedList button:contains(" + cmd + ")").length ).toBe(1)
    
    $("#selectedList button:contains(" + cmd + ")").trigger("click") 
    expect( $("#selectedList button:contains(" + cmd + ")").length ).toBe(0)    
  })

  it("returns a list of selected commands, separated by commas", function(){
    $("#workloadItems button:contains('cf:push')").trigger("click")
    $("#workloadItems button:contains('dummyWithErrors')").trigger("click")
    $("#workloadItems button:contains('cf:push')").trigger("click")

    expect( workloadList.workloads() ).toBe("cf:push,dummyWithErrors,cf:push")    
  })

  it("removes a selected command when selected command is clicked", function(){
    var cmd = "rest:target"

    $("#workloadItems button:contains(" + cmd + ")").trigger("click") 
    expect( $("#selectedList button:contains(" + cmd + ")").length ).toBe(1)

    $("#selectedList button:contains(" + cmd + ")").trigger("click") 
    expect( $("#selectedList button:contains(" + cmd + ")").length ).toBe(0)
  })

  it("displays arguments that is required by the workload command", function(){    
    var cmd = "rest:login"    
    var node = workloadList.availableCmds()[findWorkloadIndex(cmd)];

    node.args.forEach(function(arg){             
        expect( workloadList.reqArguments()[findArgumentIndex(arg)].display() ).toBe('none')      
    })

    $("#workloadItems button:contains(" + cmd + ")").trigger("click") 

    node.args.forEach(function(arg){      
        expect( workloadList.reqArguments()[findArgumentIndex(arg)].display() ).toBe('inherit')
    })
  })

  it("auto includes required parent commands when the child command is selected", function(){    
    var i = 0
    var cmd = "rest:push"

    $("#workloadItems button:contains(" + cmd + ")").trigger("click") 

    var node = workloadList.availableCmds()[findWorkloadIndex(cmd)];
    node.requires.forEach(function(parentCmd){      
      expect( $("#selectedList").find("button")[i].textContent.trim() ).toBe(parentCmd)
      i++
    })
  })

  it("will not remove a selected command when there is a dependency in the selected list, and popup warning in alert box", function(){    
    var cmd = "rest:push"
    var alertCalled = false

    //hijack the alert box so it doesn't block
    var orgAlert = window.alert    
    window.alert = function () {
      alertCalled = true
    };
    
    $("#workloadItems button:contains(" + cmd + ")").trigger("click") 

    expect( $("#selectedList button:contains('rest:target')").length ).toBe(1)
    expect( $("#selectedList button:contains('rest:login')").length ).toBe(1)

    $("#selectedList button:contains('rest:target')").trigger("click") 
    expect(alertCalled).toBe(true)   

    window.alert = orgAlert
  })

  it("checks for valid 'CF Target' input", function(){
    var node = workloadList.reqArguments()[findArgumentIndex("rest:target")];
    node.display("inherit")
    
    var target = "invalid_url"
    node.value(target)
    expect(workloadList.validation.HasError()).toBe(true)

    target = "http://api.example.com"
    node.value(target)
    expect(workloadList.validation.HasError()).toBe(false)
  });

  it("checks for non-empty 'CF Username' input", function(){
    var node = workloadList.reqArguments()[findArgumentIndex("rest:username")];
    node.display("inherit")

    var user = ""
    node.value(user)
    expect(workloadList.validation.HasError()).toBe(true)

    user = "user1,user2"
    node.value(user)
    expect(workloadList.validation.HasError()).toBe(false)
  });

  it("checks for non-empty 'CF Password' input", function(){
    var node = workloadList.reqArguments()[findArgumentIndex("rest:password")];
    node.display("inherit")

    var pass = ""
    node.value(pass)
    expect(workloadList.validation.HasError()).toBe(true)

    pass = "pass1"
    node.value(pass)
    expect(workloadList.validation.HasError()).toBe(false)
  });

  it("checks for non-empty 'CF Space' input", function(){
    var node = workloadList.reqArguments()[findArgumentIndex("rest:space")];
    node.display("inherit")

    var space = ""
    node.value(space)
    expect(workloadList.validation.HasError()).toBe(true)

    space = "pass1"
    node.value(space)
    expect(workloadList.validation.HasError()).toBe(false)
  });

  function findWorkloadIndex (cmd, start, end) {
    start = (start >= 0)? start : 0;
    end = ( end >= 0)? end : workloadList.availableCmds().length;
    for (var i = start; i < end; i++) {
      if (workloadList.availableCmds()[i].name == cmd) return i;
    }
    return -1;
  }

  function findArgumentIndex (cmd, start, end) {
    start = (start >= 0)? start : 0;
    end = ( end >= 0)? end : workloadList.reqArguments().length;
    for (var i = start; i < end; i++) {      
      if (workloadList.reqArguments()[i].forCmd == cmd) return i;
    }
    return -1;
  }

})

describe("The view", function() {
  var experiment
  var experimentList
  var workloadNode
  var throughputNode

  beforeEach(function() {
    experiment = { run: function() {}, url: ko.observable(""), state: ko.observable(""), view: function() {}, csvUrl: ko.observable(""), config: { iterations: ko.observable(1), concurrency: ko.observable(1), interval: ko.observable(0), stop: ko.observable(0) } }
    experimentList = { experiments: [], refreshNow: function(){} }
    spyOn(experimentList, "refreshNow")
    spyOn(experiment, "view")
    spyOn(experiment, "run")
    v = new pat.view(experimentList, experiment)
    spyOn(v, "redirectTo").andReturn()
    v.start()
    workloadNode = $("div.workloadContainer").get(0)
    throughputNode = $("div.throughputContainer").get(0)
  })

  describe("clicking start", function() {
    it("runs the experiment", function() {
      expect(experiment.run).toHaveBeenCalled()
    })
  })

  describe("showThroughput()", function() {
    it("shows throughput graph and hides others when called", function() {
      v.showThroughput()
      expect( $(throughputNode).css('display') ).toBe("block")
      expect( $(workloadNode).css('display') ).toBe("none")
    })

    it("sets throughputVisible to true", function() {
      v.showThroughput()
      expect(v.throughputVisible()).toBe(true)
    })
  })

  describe("showWorkload()", function() {
    it("shows workload graph and hides others when called", function() {
      v.showWorkload()
      expect( $(throughputNode).css('display') ).toBe("none")
      expect( $(workloadNode).css('display') ).toBe("block")
    })

    it("sets workloadVisible to true", function() {
      v.showWorkload()
      expect(v.workloadVisible()).toBe(true)
    })
  })

  describe("when the state of the experiment changes to running", function() {
    beforeEach(function() { experiment.state("running") })

    it("sets canStart to false", function() {
      expect(v.canStart()).toBe(false)
    })

    it("sets canStop to true", function() {
      expect(v.canStop()).toBe(true)
    })

    it("sets noExperimentRunning to false", function() {
      expect(v.noExperimentRunning()).toBe(false)
    })

    it("refreshes the experiments list", function() {
      expect(experimentList.refreshNow).toHaveBeenCalled()
    })
  })

  describe("validation", function() {
    it("prevents iterations being <= 0", function() {
      v.numIterations(-1)
      v.numConcurrent(1)
      expect(v.numIterationsHasError()).toBe(true)
      expect(v.numConcurrentHasError()).toBe(false)
      expect(v.formHasNoErrors()).toBe(false)
    })

    it("prevents concurrency being <= 0", function() {
      v.numConcurrent(-1)
      v.numIterations(1)
      expect(v.numIterationsHasError()).toBe(false)
      expect(v.numConcurrentHasError()).toBe(true)
      expect(v.formHasNoErrors()).toBe(false)
    })

    it("prevents interval being < 0", function() {
      v.numInterval(-1)
      expect(v.numIntervalHasError()).toBe(true)
      expect(v.formHasNoErrors()).toBe(false)
    })

    it("prevents stop being < 0", function() {
      v.numStop(-1)
      expect(v.numStopHasError()).toBe(true)
      expect(v.formHasNoErrors()).toBe(false)
    })
  })

  describe("hash urls", function() {
    it("does nothing if the hash is empty", function() {
      v.onHashChange("#")
      expect(experiment.view).not.toHaveBeenCalledWith()
    })

    it("views an experiment when the url hash changes", function() {
      v.onHashChange("#foo.csv")
      expect(experiment.view).toHaveBeenCalledWith("foo.csv")
    })
  })

  describe("when the experiment has an associated CSV URL", function() {
    beforeEach(function() { experiment.csvUrl("some-url.csv") })

    it("sets canDownloadCsv to true", function() {
      expect(v.canDownloadCsv()).toBe(true)
    })

    describe("clicking downloadCsv", function() {
      it("redirects to the csv URL", function() {
        v.downloadCsv()
        expect(v.redirectTo).toHaveBeenCalledWith("some-url.csv")
      })
    })
  })

  describe("Previous Histories Popup", function() {
    it("should be hidden from the view by default", function() {
      var property = $('#historyPopup').css('display');
      expect(property).toBe("none")
    })

    it("should be visible when histories button is clicked", function() {
      $('[data-target = "#historyPopup"]').trigger("click");
      waits(300);
      runs(function() {
        var property = $('#historyPopup').css('display');
        expect(property).toBe("block")
      });
    })

    it("should hide from view when close button is clicked", function() {
      $('#historyPopup').find('.close').trigger("click");
      waits(600);
      runs(function() {
        var property = $('#historyPopup').css('display');
        expect(property).toBe("none")
      });
    })
  })

  describe("Experiment Configuration Popup", function() {
    it("should be hidden from the view by default", function() {    
      var property = $('#experimentPopup').css('display');
      expect(property).toBe("none")
    })

    it("should be visible when experiment configuration button is clicked", function() {    
      $('[data-target = "#experimentPopup"]').trigger("click");      
      waits(300);
      runs(function() {
        var property = $('#experimentPopup').css('display');
        expect(property).toBe("block")  
      });
    })

    it("should hide from view when close button is clicked", function() {    
      $('#experimentPopup').find('.close').trigger("click");
      waits(600);
      runs(function() {
        var property = $('#experimentPopup').css('display');          
        expect(property).toBe("none")  
      });
    })
  })
})

describe("DOM elements manipulation", function(){
  $("div", "#target").empty();
  d3_workload.init(document.getElementById("target"));
  d3_throughput.init(document.getElementById("target"));

  var dom = new DOM();
  var workloadNode = $("div.workloadContainer").get(0)
  var throughputNode = $("div.throughputContainer").get(0)

  it("hides the graph node when hideContent() is used", function(){
    d3_throughput.changeState(dom.showGraph)
    expect( $(throughputNode).css('display') ).toBe("block")
    d3_throughput.changeState(dom.hideContent)
    expect( $(throughputNode).css('display') ).toBe("none")
  })

  it("hides current graph when a new graph is swapped into view", function(){
    d3_workload.changeState(dom.showGraph)
    expect( $(workloadNode).css('display') ).toBe("block")
    d3_throughput.changeState(dom.contentIn)
    expect( $(throughputNode).css('display') ).toBe("block")
    expect( $(workloadNode).css('display') ).toBe("none")
  })

})

describe("Throughput chart", function() {
  const margin = {top: 50, right: 30, bottom: 30, left: 30};
  $("div.throughputContainer").empty();
  var chart = d3_throughput.init(document.getElementById("target"));
  var svgWidth = $(document.getElementById("target")).width() - margin.left - margin.right
  var svgHeight = $(document.getElementById("target")).height() - margin.top - margin.bottom
  var node = $("div.throughputContainer").get(0)

  it("should draw a line to go through points based on the throughput", function() {
    var workload = [{ Commands: { "login": {"Count": 1, "Throughput": 0.5}}},
                    { Commands: { "login": {"Count": 2, "Throughput": 0.3}}},
                    { Commands: { "login": {"Count": 3, "Throughput": 0.6}}}];

    var scaleX = d3.scale.linear().domain([0, workload.length]).range([0, svgWidth]);
    var scaleY = d3.scale.linear().domain([0.6, 0]).range([10, svgHeight]);

    chart(workload);

    var paths = $("svg.throughput").find("path.line")[0].getAttribute("d")
    var point1 = scaleX(1) + "," + scaleY(0.5)
    var point2 = scaleX(2) + "," + scaleY(0.3)
    var point3 = scaleX(3) + "," + scaleY(0.6)
    expect(paths).toContain(point1);
    expect(paths).toContain(point2);
    expect(paths).toContain(point3);
  })

  it("should draw a line for each command in a workload", function() {
    var workload = [{ Commands: {
        "login": {"Throughput": 0.5},
        "push":  {"Throughput": 0.1},
        "list":  {"Throughput": 0.3}
      } }];

    chart(workload);

    expect( $(node).find("path.line").length ).toBe(3);
  })

  it("should draw with a different color for each command", function() {
    var workload = [{ Commands: {
        "login": {"Throughput": 0.5},
        "push": {"Throughput": 0.1},
        "list": {"Throughput": 0.3}
      } }];

    chart(workload);

    var color1 = $(node).find("path.line")[0].style.stroke
    var color2 = $(node).find("path.line")[1].style.stroke
    var color3 = $(node).find("path.line")[2].style.stroke

    expect (color1).not.toEqual(color2)
    expect (color1).not.toEqual(color3)
    expect (color2).not.toEqual(color3)
  })

  it("it should show colored tooltips of throughput values when mouse hover over a line", function() {
    var workload = [{ Commands: { "login": {"Count": 1, "Throughput": 0.50}}},
                    { Commands: { "login": {"Count": 2, "Throughput": 0.30}}},
                    { Commands: { "login": {"Count": 3, "Throughput": 0.60}}}];

    chart(workload);

    expect( $(node).find("g.datalogin").length ).toEqual(0);
    d3.select(node).select("path.line").on("mouseover")({cmd:"login", throughput:[0.5, 0.3, 0.6]});
    expect( $(node).find("g.datalogin").length ).toEqual(3);

    expect( $(node).find("g.datalogin text")[0].textContent ).toEqual("0.50")
    expect( $(node).find("g.datalogin text")[1].textContent ).toEqual("0.30")
    expect( $(node).find("g.datalogin text")[2].textContent ).toEqual("0.60")

    var color = $(node).find("path.line")[0].getAttribute("stroke");
    expect( $(node).find("g.datalogin circle")[0].getAttribute("fill") ).toEqual(color)
  })

  it("should replace illegal characters with underscore in tooltip class names", function() {
    var illegalName = "cf:login+123";
    var workload = [{ Commands: { illegalName: {"Count": 1, "Throughput": 0.50}}}];

    chart(workload);
    d3.select(node).select("path.line").on("mouseover")({cmd: illegalName, throughput:[0.50]});

    expect( $(node).find("g.data" + illegalName).length ).toEqual(0);

    expect( $(node).find("g.data" + "cf_login_123").length ).toEqual(1);
  })

  it("should show the maximum command throughput in seconds in the y-axis", function() {
    var workload = [{ Commands: {
        "login": {"Throughput": 0.5},
        "push": {"Throughput": 0.3},
        "list": {"Throughput": 0.9}
      } }];
    chart(workload);

    var tickSize = 0;
    var tickMax = 0;
    var ticks = $(node).find(".y.axis text");

    for (var i =0; i < ticks.length; i++) {
      if (parseFloat(ticks[i].textContent) > tickMax) {
        tickSize = parseFloat(ticks[i].textContent) - tickMax ;
        tickMax = parseFloat(ticks[i].textContent);
      }
    }

    expect( tickMax ).toBeCloseTo(0.9, tickSize);
  });

  it("should show the number of iteration in the x-axis", function() {
    var workload = [{ Commands: {"login": {"Throughput": 0.5}} },
                    { Commands: {"login": {"Throughput": 0.5}} },
                    { Commands: {"login": {"Throughput": 0.5}} }];
    chart(workload);

    var tickSize = 0;
    var tickMax = 0;
    var ticks = $(node).find(".x.axis text");

    for (var i =0; i < ticks.length; i++) {
      if (parseFloat(ticks[i].textContent) > tickMax) {
        tickSize = parseFloat(ticks[i].textContent) - tickMax ;
        tickMax = parseFloat(ticks[i].textContent);
      }
    }

    expect( tickMax ).toBeCloseTo(3, tickSize);
  });

  it("should draw legend in the same color of it's corresponding line", function() {
    var workload = [{ Commands: {
        "list": {"Throughput": 0.5}
      } }];

    chart(workload);

    var color = $(node).find("path.line")[0].style.stroke
    expect( $(node).find("g.tplegend rect")[0].style.fill ).toEqual(color)
  })

  it("should show legend to indicate what command the lines are representing", function() {
    var workload = [{ Commands: {
        "login": {"Throughput": 0.5},
        "push":  {"Throughput": 0.1}
      } }];

    chart(workload);

    expect( $(node).find("g.tplegend").length ).toEqual(2);
  })

  it("should show updated legend when new command is used in a experiment", function() {
    var workload = [{ Commands: {
        "login": {"Throughput": 0.5},
        "push":  {"Throughput": 0.1}
      } }];

    chart(workload);

    expect( $(node).find("g.tplegend text")[0].textContent ).toEqual("login")
    expect( $(node).find("g.tplegend text")[1].textContent ).toEqual("push")

    workload = [{ Commands: { "list": {"Throughput": 0.2} }}];

    chart(workload);

    setTimeout(function () {
      expect( $(node).find("g.tplegend text")[0].textContent ).toEqual("list")
      expect( $(node).find("g.tplegend text")[1] ).toEqual(null)
    }, 800);
  })

})

describe("Bar chart", function() {
  const sec = 1000000000;
  const gap = 1;
  const margin = {top: 50, right: 40, bottom: 30, left: 30};

   var barWidth = 30;
  
  var chart, node, chartArea;

  beforeEach(function(){
    $("div.workloadContainer").empty();
    $("#target").empty();
    chart = d3_workload.init(document.getElementById("target"));
    node = $("div.workloadContainer").get(0);
    chartArea = $('svg.workload > g > g:eq(1) > g ').get(0);
  })

  it("should draw a bar for each iteration", function() {
    var data = [];
    for (var i = 0; i < 3; i ++) {
        data.push( {"LastResult" : 1 * sec} );
    }
    chart(data);

    var totalBars = $( node ).find("rect.iterations").length;
    expect( totalBars ).toBe(3);
  });

  it("should not draw a graph if data is empty", function(){
    $(chartArea).empty();
    var data = [];
    chart(data);

    var totalBars = $( node ).find("rect.iterations").length;
    expect( totalBars ).toBe(0);
  })

  it("should show the maximum LastResult in seconds in the y-axis", function() {
    var LastResult = 0;
    var data = [];
    for (var i = 1; i <= 10; i ++) {
      LastResult = i * sec ;
      data.push( {"LastResult" : LastResult} );
    }

    chart(data);

    var tickSize = 0;
    var tickMax = 0;
    var ticks = $(node).find(".y.axis text");

    for (var i =0; i < ticks.length; i++) {
      if (parseFloat(ticks[i].textContent) > tickMax) {
        tickSize = parseFloat(ticks[i].textContent) - tickMax ;
        tickMax = parseFloat(ticks[i].textContent);        
      }
    }

    expect( tickMax ).toBeCloseTo(10, tickSize);
  });

  it("should show error by drawing the bar in the color brown with the CSS class 'error'", function() {
    var data = [{"LastResult" : 2 * sec, "TotalErrors": 0},
                {"LastResult" : 5 * sec, "TotalErrors": 0},
                {"LastResult" : 1 * sec, "TotalErrors": 1}];
    chart(data);

    var bars = d3.select( node ).selectAll("rect.iterations");

    bars.each(function(d,i) {
      if (d.TotalErrors == 0) {
        expect( d3.select(this).classed("error") ).toBe(false)
      } else {
        expect( d3.select(this).classed("error") ).toBe(true)
      }
    })
  })

  it("should auto-pan to the left when new data is drawn outside of the viewable area", function() {
    var data = [];
    var viewableWidth = $(node).width() - margin.left - margin.right;
    var max_data = parseInt(viewableWidth / (barWidth + gap));

    for (var i = 1; i <= max_data; i ++) {
      data.push( {"LastResult" : 5} );
    }
    chart(data);
    waits(500);
    runs(function () {
      expect(parseInt(getTranslateX(d3.select( chartArea )))).toBe(0);
    }, 500);

    var extra_data = 5;
    waits(50);
    runs(function(){
      for (var i = 1; i <= extra_data; i ++) {
        data.push( {"LastResult" : 5} );
      }
      chart(data);
    }, 50);

    waits(500);
    runs(function() {
      expect(parseInt(getTranslateX(d3.select( chartArea )))).toBeLessThan(-1 * extra_data * (barWidth + gap));
    });
  });

  it("should auto-pan back into view if the chart is panned out of the viewable area", function() {
    var data = [];
    var viewableWidth = $(node).width() - margin.left - margin.right;

    var interval = setInterval(function() {
      data.push( {"LastResult" : 5} );
      chart(data);
    }, 80);


    waits(500);
    runs(function(){
      d3.select( chartArea )
        .attr("transform","translate(" + (viewableWidth * 2) + ", 0)");
    }, 500);

    waits(1000);
    runs(function () {
      expect(parseInt(getTranslateX(d3.select( chartArea )))).toBeLessThan( viewableWidth );
      clearInterval(interval);
    }, 1000);

  });

  it("should draw a block for each commands", function() {
     var data = [{"Commands": {
                  "dummy1":{ "TotalTime": 3 * sec },
                  "dummy2":{ "TotalTime": 2 * sec },
                  "dummy3":{ "TotalTime": 3 * sec }}, 
                "LastResult" : 8 * sec }];
    chart(data);

    var totalCommands = $( node ).find("rect.bar").length;

    expect( totalCommands ).toBe(3)
  })

  it("should stack command blocks for an iterations within the same bar", function() {
     var data = [{"Commands": {
                  "dummy1":{ "TotalTime": 3 * sec },                  
                  "dummy2":{ "TotalTime": 3 * sec }}, 
                "LastResult" : 6 * sec }];
    chart(data);
    var x1 = $(node).find("rect.bar")[0].getAttribute("x")
    var x2 = $(node).find("rect.bar")[1].getAttribute("x")

    var y1 = $(node).find("rect.bar")[0].getAttribute("y")
    var y2 = $(node).find("rect.bar")[1].getAttribute("y")

    expect( x1 ).toEqual( x2 )
    expect( y1 ).toBeGreaterThan( y2 ) //y1>y2 because y-axis in d3 is inverted
  })

  it("should shows each command blocks in different colors", function() {
     var data = [{"Commands": {
                  "dummy1":{ "TotalTime": 3 * sec },                  
                  "dummy2":{ "TotalTime": 5 * sec }, 
                  "dummy3":{ "TotalTime": 3 * sec }}, 
                "LastResult" : 6 * sec }];
    chart(data);
    var color1 = window.getComputedStyle($(node).find("rect.bar")[0]).getPropertyValue("fill")
    var color2 = window.getComputedStyle($(node).find("rect.bar")[1]).getPropertyValue("fill")
    var color3 = window.getComputedStyle($(node).find("rect.bar")[2]).getPropertyValue("fill")
    expect( color1 ).toNotEqual( color2 )
    expect( color1 ).toNotEqual( color3 )
    expect( color2 ).toNotEqual( color3 )
  })

  it("should contains attributes of a jQuery mouse hover tooltip", function() {
     var data = [{"Commands": {
                  "dummy1":{ "TotalTime": 3 * sec },                  
                  "dummy2":{ "TotalTime": 5 * sec }}, 
                "LastResult" : 8 * sec }];
    chart(data);

    expect( $("svg.workload rect.bar")[0].getAttribute('data-toggle') ).toBe("tooltip")
    expect( $("svg.workload rect.bar")[0].getAttribute('data-original-title') ).toBe("dummy1: 3.00 sec")

    expect( $("svg.workload rect.bar")[1].getAttribute('data-toggle') ).toBe("tooltip")
    expect( $("svg.workload rect.bar")[1].getAttribute('data-original-title') ).toBe("dummy2: 5.00 sec")
  })

  function getTranslateX(node) {
    var splitted = node.attr("transform").split(",");
    return parseInt(splitted [0].split("(")[1]);
  };

  it("has a utility function to turn 'data' into array containing commands, start time and duration", function(){
    var data = [{"Commands": {
                  "dummy1":{ "TotalTime": 1 * sec },                  
                  "dummy2":{ "TotalTime": 3 * sec }, 
                  "dummy3":{ "TotalTime": 2 * sec }}, 
                "LastResult" : 6 * sec }];
    
    var cmdData = d3_workload.toBarGraph(data)
    
    expect(cmdData[0]).toEqual({"label" : "dummy1", "y" : 0, "height" : 1 * sec, "iteration" : 0})
    expect(cmdData[1]).toEqual({"label" : "dummy2", "y" : 1 * sec, "height" : 3 * sec, "iteration" : 0})
    expect(cmdData[2]).toEqual({"label" : "dummy3", "y" : 4 * sec, "height" : 2 * sec, "iteration" : 0})
  })

  it("sorts the command in alphabetical order", function(){
    var data = [{"Commands": {
                  "mango":{ "TotalTime": 1 * sec },                  
                  "orange":{ "TotalTime": 3 * sec }, 
                  "apple":{ "TotalTime": 2 * sec }}, 
                "LastResult" : 6 * sec }];
    
    var cmdData = d3_workload.toBarGraph(data)
    
    expect(cmdData[0]).toEqual({"label" : "apple", "y" : 0, "height" : 2 * sec, "iteration" : 0})
    expect(cmdData[1]).toEqual({"label" : "mango", "y" : 2 * sec, "height" : 1 * sec, "iteration" : 0})
    expect(cmdData[2]).toEqual({"label" : "orange", "y" : 3 * sec, "height" : 3 * sec, "iteration" : 0})
  })
});

describe("The experiment list", function() {

  var self = this
  var experiments
  var list

  describe("refreshing", function() {
    beforeEach(function() {
      self.experiments = [ { name: "a", "Location": "notthisone" }, { name: "b", "Location": "/experiments/123" } ]
      spyOn($, "get").andCallFake(function(url, callback) { callback({ "Items": self.experiments }) })
      list = pat.experimentList()
    })

    it("adds all the items to the experiments array in reverse order", function() {
      self.experiments = [1, 2, 3]
      list.refresh()
      expect(list.experiments()).toEqual(self.experiments.reverse())
    })

    it("refreshes on startup", function() {
      expect(list.experiments()).toEqual(self.experiments.reverse())
    })

    describe("when an experimentChanged event fired", function() {
      it("sets the active experiment in the list", function() {
        $(document).trigger("experimentChanged", "/experiments/123")
        active = list.experiments().filter(function(e) { return e.active() })
        expect(active.length).toBe(1)
        expect(active[0].name).toEqual("b")
      })
    })
  })
})

describe("Running an experiment", function my() {

  var replyUrl = "foo/bar/baz"

  describe("Calling the endpoint", function() {

    var pushes = 3
    var concurrency = 5
    var experiment
    var listener = { onExperimentChanged: function() {} }

    beforeEach(function() {

      replyUrl = replyUrl + 1

      spyOn($, "post").andCallFake(function(url, data, callback) { callback({ "Location": replyUrl }) })
      spyOn($, "get").andCallFake(function(url, callback) {  })
      spyOn(listener, "onExperimentChanged")

      $(document).on("experimentChanged", listener.onExperimentChanged)

      experiment = pat.experiment()
      experiment.config.iterations(pushes)
      experiment.config.concurrency(concurrency)
      experiment.data([1,2,3])
      experiment.run()
    })

    it("sends a POST to the /experiments/ endpoint", function() {
      expect($.post).toHaveBeenCalledWith("/experiments/", jasmine.any(Object), jasmine.any(Function))
    })

    it("sends the iterations and concurrency in the POST body", function() {
      expect($.post.mostRecentCall.args[1].iterations).toBe(3)
      expect($.post.mostRecentCall.args[1].concurrency).toBe(5)
    })

    it("sends a GET to the tracking URL", function() {
      expect($.get).toHaveBeenCalledWith(replyUrl, jasmine.any(Function))
    })

    it("clears any existing data", function() {
      expect(experiment.data().length).toEqual(0)
    })

    it("triggers an experimentChanged event", function() {
      expect(listener.onExperimentChanged).toHaveBeenCalledWith(jasmine.any(Object), replyUrl)
    })
  })

  describe("When results are returned", function() {

    var refreshRate = 800
    var csvUrl   = "foo/bar/baz.csv"
    var experiment
    var results

    beforeEach(function() {
      a = {"Type": 0, "name": "a"}
      b = {"Type": 1, "name": "b"}
      spyOn($, "post").andCallFake(function(url, data, callback) { callback({ "Location": replyUrl, "CsvLocation": csvUrl }) })
      spyOn($, "get").andCallFake(function(url, callback) {
        callback({ "Items": [a,b] })
      })

      experiment = pat.experiment(refreshRate)
      spyOn(experiment, "refresh").andCallThrough()
      spyOn(experiment, "waitAndRefreshOnce") //mocked because jasmine.Clock was being painful
      experiment.run()
    })

    it("updates with the latest data", function() {
      expect(experiment.data()).toEqual([a])
    })

    it("only includes data of type 0 (ResultSample)", function() {
      expect(experiment.data()).not.toBe([a, b])
    })

    it("refreshes the data at the refresh rate after data is returned", function() {
      expect(experiment.waitAndRefreshOnce.callCount).toEqual(1)
      $.get.mostRecentCall.args[1]({"Items": [{"Type": 0}]})
      expect(experiment.waitAndRefreshOnce.callCount).toEqual(2)
    })

    it("updates the csv url", function() {
      expect(experiment.csvUrl()).toBe(csvUrl)
    })

    it("updates the state to 'running'", function() {
      expect(experiment.state()).toBe("running")
    })
  })
})

