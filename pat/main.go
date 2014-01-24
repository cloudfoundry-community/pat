package main

import (
	"flag"
	"fmt"
	"github.com/julz/pat"
	"github.com/julz/pat/parser"
	"github.com/julz/pat/server"
)

func main() {
	useServer := flag.Bool("server", false, "true to run the HTTP server interface")
	pushes := flag.Int("pushes", 1, "number of pushes to attempt")
	concurrency := flag.Int("concurrency", 1, "max number of pushes to attempt in parallel")
	silent := flag.Bool("silent", false, "true to run the commands and print output the terminal")
	output := flag.String("output", "", "if specified, writes benchmark results to a CSV file")
	config := flag.String("config", "", "name of the command line configuration file you wish to use (including path to file)")
	interval := flag.Int("interval", 0, "repeat a workload at n second interval, to be used with -stop")
	stop := flag.Int("stop", 0, "stop a repeating interval after n second, to be used with -interval")
	flag.Parse()

	if *config != "" {
		cfg, err := parser.NewPATsConfiguration(*config)
		if err != nil {
			panic(err) //(dan) should just report the error and stop if there is an error loading the configuration file
		}
		*useServer = cfg.Cli_commands.Server
		*pushes = cfg.Cli_commands.Pushes
		*concurrency = cfg.Cli_commands.Concurrency
		*silent = cfg.Cli_commands.Silent
		*output = cfg.Cli_commands.Output
		*interval = cfg.Cli_commands.Interval
		*stop = cfg.Cli_commands.Stop

	}

	flag.Parse() //(dan) Regrab the commandline flags. This can be used to override the configurations set by the config file. May be useful later on.
	if *useServer == true {
		fmt.Println("Starting in server mode")
		server.Serve()
		server.Bind()
	} else {
		pat.RunCommandLine(*pushes, *concurrency, *silent, *output, *interval, *stop)
	}
}
