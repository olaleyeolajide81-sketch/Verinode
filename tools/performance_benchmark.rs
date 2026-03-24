/*
Performance Benchmarking Tool for Verinode Gas Optimization Suite

This tool provides comprehensive performance benchmarking capabilities:
- Baseline performance measurement
- Optimization impact analysis
- Historical trend tracking
- Performance regression detection
- Automated benchmark reporting
*/

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use clap::{Arg, Command};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResult {
    pub benchmark_id: String,
    pub contract_name: String,
    pub function_name: String,
    pub timestamp: DateTime<Utc>,
    pub baseline_gas: u64,
    pub optimized_gas: u64,
    pub gas_reduction: f64,
    pub execution_time_baseline_ms: u64,
    pub execution_time_optimized_ms: u64,
    pub memory_usage_baseline_kb: u64,
    pub memory_usage_optimized_kb: u64,
    pub optimization_score: f64,
    pub performance_grade: PerformanceGrade,
    pub optimizations_applied: Vec<String>,
    pub regression_detected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PerformanceGrade {
    Excellent,  // >50% improvement
    Good,       // 35-50% improvement
    Fair,       // 20-35% improvement
    Poor,       // <20% improvement
    Regression, // Negative impact
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkSuite {
    pub suite_id: String,
    pub name: String,
    pub description: String,
    pub benchmarks: Vec<BenchmarkResult>,
    pub overall_gas_reduction: f64,
    pub overall_performance_score: f64,
    pub target_reduction_met: bool,
    pub created_at: DateTime<Utc>,
    pub environment_info: EnvironmentInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentInfo {
    pub rust_version: String,
    pub soroban_version: String,
    pub cpu_info: String,
    pub memory_info: String,
    pub os_info: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoricalTrend {
    pub date: DateTime<Utc>,
    pub average_gas_reduction: f64,
    pub total_gas_saved: u64,
    pub benchmarks_count: u32,
    pub performance_score: f64,
}

pub struct PerformanceBenchmark {
    baseline_data: HashMap<String, u64>,
    benchmark_history: Vec<BenchmarkSuite>,
    current_suite: Option<BenchmarkSuite>,
    performance_thresholds: PerformanceThresholds,
}

#[derive(Debug, Clone)]
pub struct PerformanceThresholds {
    pub target_gas_reduction: f64,
    pub minimum_acceptable_reduction: f64,
    pub regression_threshold: f64,
    pub performance_score_weight: f64,
}

impl PerformanceBenchmark {
    pub fn new() -> Self {
        Self {
            baseline_data: HashMap::new(),
            benchmark_history: Vec::new(),
            current_suite: None,
            performance_thresholds: PerformanceThresholds {
                target_gas_reduction: 35.0,
                minimum_acceptable_reduction: 20.0,
                regression_threshold: -5.0,
                performance_score_weight: 0.8,
            },
        }
    }

    pub fn run_comprehensive_benchmark(
        &mut self,
        contracts_dir: &str,
        output_format: &str,
        output_path: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        println!("🚀 Starting comprehensive performance benchmark...");
        
        let start_time = Instant::now();
        
        // Create new benchmark suite
        let suite_id = format!("bench_{}", Utc::now().timestamp());
        let mut suite = BenchmarkSuite {
            suite_id: suite_id.clone(),
            name: "Gas Optimization Benchmark Suite".to_string(),
            description: "Comprehensive benchmark of gas optimization effectiveness".to_string(),
            benchmarks: Vec::new(),
            overall_gas_reduction: 0.0,
            overall_performance_score: 0.0,
            target_reduction_met: false,
            created_at: Utc::now(),
            environment_info: self.collect_environment_info(),
        };

        // Find all Rust contract files
        let contract_files = self.find_contract_files(contracts_dir)?;
        
        println!("📁 Found {} contract files to benchmark", contract_files.len());

        // Benchmark each contract
        for contract_file in contract_files {
            let contract_name = Path::new(&contract_file)
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            
            println!("🔍 Benchmarking contract: {}", contract_name);
            
            let contract_benchmarks = self.benchmark_contract(&contract_file, &contract_name)?;
            suite.benchmarks.extend(contract_benchmarks);
        }

        // Calculate suite metrics
        suite.overall_gas_reduction = self.calculate_overall_reduction(&suite.benchmarks);
        suite.overall_performance_score = self.calculate_performance_score(&suite.benchmarks);
        suite.target_reduction_met = suite.overall_gas_reduction >= self.performance_thresholds.target_gas_reduction;

        let duration = start_time.elapsed();
        println!("✅ Benchmark completed in {:.2} seconds", duration.as_secs_f64());
        println!("📊 Overall gas reduction: {:.2}%", suite.overall_gas_reduction);
        println!("🎯 Target met: {}", if suite.target_reduction_met { "✅ YES" } else { "❌ NO" });

        // Store results
        self.current_suite = Some(suite.clone());
        self.benchmark_history.push(suite.clone());

        // Generate reports
        self.generate_reports(&suite, output_format, output_path)?;

        // Check for regressions
        self.detect_regressions(&suite);

        Ok(())
    }

    fn find_contract_files(&self, dir: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let mut contract_files = Vec::new();
        
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && path.extension().map_or(false, |ext| ext == "rs") {
                contract_files.push(path.to_string_lossy().to_string());
            } else if path.is_dir() {
                // Recursively search subdirectories
                let sub_files = self.find_contract_files(path.to_str().unwrap())?;
                contract_files.extend(sub_files);
            }
        }
        
        Ok(contract_files)
    }

    fn benchmark_contract(
        &mut self,
        contract_file: &str,
        contract_name: &str,
    ) -> Result<Vec<BenchmarkResult>, Box<dyn std::error::Error>> {
        let mut benchmarks = Vec::new();
        
        // Read contract source code
        let source_code = fs::read_to_string(contract_file)?;
        
        // Extract functions from source code
        let functions = self.extract_functions(&source_code);
        
        for function_name in functions {
            let benchmark = self.benchmark_function(
                contract_file,
                contract_name,
                &function_name,
                &source_code,
            )?;
            
            benchmarks.push(benchmark);
        }
        
        Ok(benchmarks)
    }

    fn extract_functions(&self, source_code: &str) -> Vec<String> {
        let mut functions = Vec::new();
        
        for line in source_code.lines() {
            if line.trim().starts_with("pub fn ") {
                if let Some(fn_name) = line.split("pub fn ").nth(1) {
                    if let Some(name) = fn_name.split('(').next() {
                        functions.push(name.trim().to_string());
                    }
                }
            }
        }
        
        functions
    }

    fn benchmark_function(
        &mut self,
        contract_file: &str,
        contract_name: &str,
        function_name: &str,
        source_code: &str,
    ) -> Result<BenchmarkResult, Box<dyn std::error::Error>> {
        let benchmark_id = format!("{}_{}_{}", contract_name, function_name, Utc::now().timestamp());
        
        // Estimate baseline gas usage
        let baseline_gas = self.estimate_gas_usage(source_code, function_name);
        
        // Simulate optimized version (in practice, this would run the actual optimization)
        let optimized_source = self.simulate_optimization(source_code);
        let optimized_gas = self.estimate_gas_usage(&optimized_source, function_name);
        
        // Calculate metrics
        let gas_reduction = if baseline_gas > 0 {
            ((baseline_gas - optimized_gas) as f64 / baseline_gas as f64) * 100.0
        } else {
            0.0
        };
        
        let execution_time_baseline = self.estimate_execution_time(source_code);
        let execution_time_optimized = self.estimate_execution_time(&optimized_source);
        
        let memory_baseline = self.estimate_memory_usage(source_code);
        let memory_optimized = self.estimate_memory_usage(&optimized_source);
        
        let performance_grade = self.calculate_performance_grade(gas_reduction);
        let optimization_score = self.calculate_optimization_score(gas_reduction, performance_grade.clone());
        
        let optimizations_applied = self.identify_applied_optimizations(source_code, &optimized_source);
        let regression_detected = gas_reduction < self.performance_thresholds.regression_threshold;

        Ok(BenchmarkResult {
            benchmark_id,
            contract_name: contract_name.to_string(),
            function_name: function_name.to_string(),
            timestamp: Utc::now(),
            baseline_gas,
            optimized_gas,
            gas_reduction,
            execution_time_baseline_ms: execution_time_baseline,
            execution_time_optimized_ms: execution_time_optimized,
            memory_usage_baseline_kb: memory_baseline,
            memory_usage_optimized_kb: memory_optimized,
            optimization_score,
            performance_grade,
            optimizations_applied,
            regression_detected,
        })
    }

    fn estimate_gas_usage(&self, source_code: &str, function_name: &str) -> u64 {
        let function_code = self.extract_function_code(source_code, function_name);
        
        let mut gas_usage = 21000; // Base transaction cost
        
        // Storage operations
        gas_usage += function_code.matches("storage().set").count() as u64 * 5000;
        gas_usage += function_code.matches("storage().get").count() as u64 * 2000;
        
        // Loop operations
        gas_usage += function_code.matches("for ").count() as u64 * 3000;
        gas_usage += function_code.matches("while ").count() as u64 * 2500;
        
        // Vector operations
        gas_usage += function_code.matches("Vec::new").count() as u64 * 1500;
        gas_usage += function_code.matches("push_back").count() as u64 * 500;
        
        // String operations
        gas_usage += function_code.matches("String::from_str").count() as u64 * 1000;
        gas_usage += function_code.matches(".clone()").count() as u64 * 800;
        
        // Arithmetic operations
        gas_usage += function_code.matches(" + ").count() as u64 * 100;
        gas_usage += function_code.matches(" * ").count() as u64 * 150;
        
        // Function calls
        gas_usage += function_code.matches("fn ").count() as u64 * 200;
        
        gas_usage
    }

    fn extract_function_code(&self, source_code: &str, function_name: &str) -> String {
        let lines: Vec<&str> = source_code.lines().collect();
        let mut function_lines = Vec::new();
        let mut in_function = false;
        let mut brace_count = 0;

        for line in lines {
            if line.contains(&format!("pub fn {}", function_name)) {
                in_function = true;
                function_lines.push(line);
                brace_count += line.matches("{").count();
                brace_count -= line.matches("}").count();
                continue;
            }

            if in_function {
                function_lines.push(line);
                brace_count += line.matches("{").count();
                brace_count -= line.matches("}").count();

                if brace_count <= 0 {
                    break;
                }
            }
        }

        function_lines.join("\n")
    }

    fn simulate_optimization(&self, source_code: &str) -> String {
        let mut optimized = source_code.to_string();
        
        // Apply common optimizations
        optimized = optimized.replace("env.storage().persistent().set", "env.storage().instance().set");
        optimized = optimized.replace("env.storage().persistent().get", "env.storage().instance().get");
        optimized = optimized.replace("* 2", "<< 1");
        optimized = optimized.replace("* 4", "<< 2");
        optimized = optimized.replace("* 8", "<< 3");
        
        // Remove unnecessary clones (simplified)
        optimized = optimized.replace(".clone()", "");
        
        optimized
    }

    fn estimate_execution_time(&self, source_code: &str) -> u64 {
        // Simplified execution time estimation based on operation complexity
        let storage_ops = source_code.matches("storage().").count() as u64;
        let loop_ops = source_code.matches("for ").count() as u64 + source_code.matches("while ").count() as u64;
        let arithmetic_ops = source_code.matches(" + ").count() as u64 + source_code.matches(" * ").count() as u64;
        
        (storage_ops * 10 + loop_ops * 50 + arithmetic_ops * 2) // milliseconds
    }

    fn estimate_memory_usage(&self, source_code: &str) -> u64 {
        // Estimate memory usage in kilobytes
        let vector_ops = source_code.matches("Vec::new").count() as u64;
        let string_ops = source_code.matches("String::from_str").count() as u64;
        
        (vector_ops * 64 + string_ops * 32) // KB
    }

    fn calculate_performance_grade(&self, gas_reduction: f64) -> PerformanceGrade {
        if gas_reduction > 50.0 {
            PerformanceGrade::Excellent
        } else if gas_reduction >= 35.0 {
            PerformanceGrade::Good
        } else if gas_reduction >= 20.0 {
            PerformanceGrade::Fair
        } else if gas_reduction >= 0.0 {
            PerformanceGrade::Poor
        } else {
            PerformanceGrade::Regression
        }
    }

    fn calculate_optimization_score(&self, gas_reduction: f64, grade: PerformanceGrade) -> f64 {
        let base_score = match grade {
            PerformanceGrade::Excellent => 100.0,
            PerformanceGrade::Good => 85.0,
            PerformanceGrade::Fair => 70.0,
            PerformanceGrade::Poor => 50.0,
            PerformanceGrade::Regression => 0.0,
        };
        
        // Adjust based on actual gas reduction
        let reduction_factor = (gas_reduction / 50.0).min(1.0);
        base_score * reduction_factor
    }

    fn identify_applied_optimizations(&self, original: &str, optimized: &str) -> Vec<String> {
        let mut optimizations = Vec::new();
        
        if original.contains("persistent().set") && optimized.contains("instance().set") {
            optimizations.push("Storage Optimization".to_string());
        }
        
        if original.contains("* 2") && optimized.contains("<< 1") {
            optimizations.push("Arithmetic Optimization".to_string());
        }
        
        if original.contains(".clone()") && !optimized.contains(".clone()") {
            optimizations.push("String Optimization".to_string());
        }
        
        if original.contains("for ") && optimized.contains("// Unrolled") {
            optimizations.push("Loop Unrolling".to_string());
        }
        
        optimizations
    }

    fn calculate_overall_reduction(&self, benchmarks: &[BenchmarkResult]) -> f64 {
        if benchmarks.is_empty() {
            return 0.0;
        }
        
        let total_reduction: f64 = benchmarks.iter().map(|b| b.gas_reduction).sum();
        total_reduction / benchmarks.len() as f64
    }

    fn calculate_performance_score(&self, benchmarks: &[BenchmarkResult]) -> f64 {
        if benchmarks.is_empty() {
            return 0.0;
        }
        
        let total_score: f64 = benchmarks.iter().map(|b| b.optimization_score).sum();
        total_score / benchmarks.len() as f64
    }

    fn collect_environment_info(&self) -> EnvironmentInfo {
        EnvironmentInfo {
            rust_version: "1.70+".to_string(), // Would get actual version
            soroban_version: "20.0.0".to_string(),
            cpu_info: "Unknown".to_string(),
            memory_info: "Unknown".to_string(),
            os_info: "Linux".to_string(),
        }
    }

    fn generate_reports(
        &self,
        suite: &BenchmarkSuite,
        format: &str,
        path: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        match format {
            "json" => self.generate_json_report(suite, path)?,
            "markdown" => self.generate_markdown_report(suite, path)?,
            "csv" => self.generate_csv_report(suite, path)?,
            _ => return Err("Unsupported format".into()),
        }
        
        Ok(())
    }

    fn generate_json_report(&self, suite: &BenchmarkSuite, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string_pretty(suite)?;
        let file_path = format!("{}/benchmark_results.json", path);
        fs::write(file_path, json)?;
        println!("📄 JSON report generated");
        Ok(())
    }

    fn generate_markdown_report(&self, suite: &BenchmarkSuite, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut report = format!(
            "# Performance Benchmark Report\n\n\
            **Suite ID**: {}\n\
            **Generated**: {}\n\
            **Target Reduction**: {:.1}%\n\
            **Achieved Reduction**: {:.2}%\n\
            **Status**: {}\n\n",
            suite.suite_id,
            suite.created_at.format("%Y-%m-%d %H:%M:%S UTC"),
            self.performance_thresholds.target_gas_reduction,
            suite.overall_gas_reduction,
            if suite.target_reduction_met { "✅ TARGET MET" } else { "❌ TARGET NOT MET" }
        );

        report.push_str("## Summary\n\n");
        report.push_str(&format!(
            "- **Overall Performance Score**: {:.2}/100\n\
            - **Total Benchmarks**: {}\n\
            - **Target Met**: {}\n\n",
            suite.overall_performance_score,
            suite.benchmarks.len(),
            if suite.target_reduction_met { "Yes" } else { "No" }
        ));

        report.push_str("## Detailed Results\n\n");
        report.push_str("| Contract | Function | Baseline Gas | Optimized Gas | Reduction | Grade | Score |\n");
        report.push_str("|----------|----------|---------------|---------------|-----------|-------|-------|\n");

        for benchmark in &suite.benchmarks {
            let grade_str = match benchmark.performance_grade {
                PerformanceGrade::Excellent => "🟢 Excellent",
                PerformanceGrade::Good => "🟡 Good",
                PerformanceGrade::Fair => "🟠 Fair",
                PerformanceGrade::Poor => "🔴 Poor",
                PerformanceGrade::Regression => "⚠️ Regression",
            };
            
            report.push_str(&format!(
                "| {} | {} | {:,} | {:,} | {:.2}% | {} | {:.1} |\n",
                benchmark.contract_name,
                benchmark.function_name,
                benchmark.baseline_gas,
                benchmark.optimized_gas,
                benchmark.gas_reduction,
                grade_str,
                benchmark.optimization_score
            ));
        }

        let file_path = format!("{}/benchmark_report.md", path);
        fs::write(file_path, report)?;
        println!("📄 Markdown report generated");
        Ok(())
    }

    fn generate_csv_report(&self, suite: &BenchmarkSuite, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut csv = "contract_name,function_name,baseline_gas,optimized_gas,gas_reduction,performance_grade,optimization_score\n".to_string();
        
        for benchmark in &suite.benchmarks {
            let grade_str = match benchmark.performance_grade {
                PerformanceGrade::Excellent => "Excellent",
                PerformanceGrade::Good => "Good",
                PerformanceGrade::Fair => "Fair",
                PerformanceGrade::Poor => "Poor",
                PerformanceGrade::Regression => "Regression",
            };
            
            csv.push_str(&format!(
                "{},{},{},{},{:.2},{},{:.2}\n",
                benchmark.contract_name,
                benchmark.function_name,
                benchmark.baseline_gas,
                benchmark.optimized_gas,
                benchmark.gas_reduction,
                grade_str,
                benchmark.optimization_score
            ));
        }

        let file_path = format!("{}/benchmark_results.csv", path);
        fs::write(file_path, csv)?;
        println!("📄 CSV report generated");
        Ok(())
    }

    fn detect_regressions(&self, suite: &BenchmarkSuite) {
        let regressions: Vec<&BenchmarkResult> = suite.benchmarks
            .iter()
            .filter(|b| b.regression_detected)
            .collect();

        if !regressions.is_empty() {
            println!("⚠️  Performance regressions detected:");
            for regression in regressions {
                println!("   - {}.{}: {:.2}% reduction", 
                    regression.contract_name, 
                    regression.function_name, 
                    regression.gas_reduction
                );
            }
        } else {
            println!("✅ No performance regressions detected");
        }
    }

    pub fn compare_with_baseline(
        &mut self,
        baseline_file: &str,
        current_results: &BenchmarkSuite,
    ) -> Result<(), Box<dyn std::error::Error>> {
        println!("📊 Comparing with baseline...");
        
        if !Path::new(baseline_file).exists() {
            return Err("Baseline file not found".into());
        }

        let baseline_data = fs::read_to_string(baseline_file)?;
        let baseline: BenchmarkSuite = serde_json::from_str(&baseline_data)?;

        println!("📈 Baseline vs Current:");
        println!("   Baseline reduction: {:.2}%", baseline.overall_gas_reduction);
        println!("   Current reduction: {:.2}%", current_results.overall_gas_reduction);
        
        let improvement = current_results.overall_gas_reduction - baseline.overall_gas_reduction;
        if improvement > 0.0 {
            println!("   🎉 Improvement: {:.2}%", improvement);
        } else {
            println!("   📉 Regression: {:.2}%", improvement.abs());
        }

        Ok(())
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let matches = Command::new("performance_benchmark")
        .version("1.0.0")
        .about("Performance benchmarking tool for Verinode gas optimization")
        .arg(
            Arg::new("input")
                .short('i')
                .long("input")
                .value_name("DIR")
                .help("Input directory containing contracts")
                .required(true),
        )
        .arg(
            Arg::new("format")
                .short('f')
                .long("format")
                .value_name("FORMAT")
                .help("Output format (json, markdown, csv)")
                .default_value("markdown"),
        )
        .arg(
            Arg::new("output")
                .short('o')
                .long("output")
                .value_name("DIR")
                .help("Output directory for reports")
                .default_value("benchmark_reports"),
        )
        .arg(
            Arg::new("baseline")
                .short('b')
                .long("baseline")
                .value_name("FILE")
                .help("Baseline file to compare against"),
        )
        .arg(
            Arg::new("target")
                .short('t')
                .long("target")
                .value_name("PERCENT")
                .help("Target gas reduction percentage")
                .default_value("35"),
        )
        .get_matches();

    let mut benchmark = PerformanceBenchmark::new();
    
    // Set target reduction if specified
    if let Some(target_str) = matches.get_one::<String>("target") {
        benchmark.performance_thresholds.target_gas_reduction = target_str.parse()?;
    }

    // Create output directory
    fs::create_dir_all(matches.get_one::<String>("output").unwrap())?;

    // Run benchmarks
    benchmark.run_comprehensive_benchmark(
        matches.get_one::<String>("input").unwrap(),
        matches.get_one::<String>("format").unwrap(),
        matches.get_one::<String>("output").unwrap(),
    )?;

    // Compare with baseline if provided
    if let Some(baseline_file) = matches.get_one::<String>("baseline") {
        if let Some(current_suite) = &benchmark.current_suite {
            benchmark.compare_with_baseline(baseline_file, current_suite)?;
        }
    }

    println!("🎉 Performance benchmarking completed!");
    Ok(())
}
