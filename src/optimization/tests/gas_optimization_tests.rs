#![cfg(test)]

use soroban_sdk::{Address, Env, String, Vec};
use crate::optimization::{
    AIOptimizer, AutoRefactor, GasAnalyzer, OptimizationReport,
    AIOptimizationResult, RefactorResult, GasAnalysisResult
};

#[test]
fn test_ai_optimizer_initialization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    
    // Test initialization
    AIOptimizer::initialize(env.clone(), admin.clone());
    
    // Verify model version is set
    let model_version = AIOptimizer::get_model_version(env.clone());
    assert_eq!(model_version, 1);
    
    // Test duplicate initialization should panic
    let result = std::panic::catch_unwind(|| {
        AIOptimizer::initialize(env.clone(), admin);
    });
    assert!(result.is_err());
}

#[test]
fn test_ai_optimizer_pattern_identification() {
    let env = Env::default();
    let admin = Address::generate(&env);
    AIOptimizer::initialize(env.clone(), admin.clone());
    
    let source_code = String::from_str(&env, r#"
        pub fn example_function(env: &Env) {
            env.storage().persistent().set(&key, &value);
            for i in 0..3 {
                process(i);
            }
            let mut vec = Vec::new(&env);
            vec.push_back(item);
        }
    "#);
    
    let target_function = String::from_str(&env, "example_function");
    let result = AIOptimizer::analyze_and_optimize(env.clone(), source_code, target_function);
    
    // Should identify multiple optimization patterns
    assert!(result.applied_patterns.len() > 0);
    assert!(result.gas_reduction > 0.0);
    assert!(result.compilation_verified);
}

#[test]
fn test_auto_refactor_initialization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    
    // Test initialization
    AutoRefactor::initialize(env.clone(), admin.clone());
    
    // Verify default rules are loaded
    let rules = AutoRefactor::get_refactor_rules(env.clone());
    assert!(rules.len() > 0);
    
    // Test duplicate initialization should panic
    let result = std::panic::catch_unwind(|| {
        AutoRefactor::initialize(env.clone(), admin);
    });
    assert!(result.is_err());
}

#[test]
fn test_auto_refactor_gas_reduction() {
    let env = Env::default();
    let admin = Address::generate(&env);
    AutoRefactor::initialize(env.clone(), admin.clone());
    
    let source_code = String::from_str(&env, r#"
        pub fn expensive_function(env: &Env) {
            env.storage().persistent().set(&key1, &val1);
            env.storage().persistent().set(&key2, &val2);
            let mut vec = Vec::new(&env);
            vec.push_back(item1);
            vec.push_back(item2);
            vec.push_back(item3);
            for i in 0..3 {
                process(i);
            }
        }
    "#);
    
    let result = AutoRefactor::auto_refactor(
        env.clone(),
        source_code,
        0.35, // 35% target reduction
        7     // Max risk level
    );
    
    // Should apply some optimizations
    assert!(result.applied_rules.len() > 0);
    assert!(result.total_gas_savings > 0);
    assert!(result.compilation_status);
}

#[test]
fn test_gas_analyzer_function_profiling() {
    let env = Env::default();
    let admin = Address::generate(&env);
    GasAnalyzer::initialize(env.clone(), admin.clone());
    
    let contract_address = Address::generate(&env);
    let source_code = String::from_str(&env, r#"
        pub fn test_function(env: &Env, value: u64) -> u64 {
            env.storage().persistent().set(&key, &value);
            let result = value * 2;
            env.storage().persistent().get(&key).unwrap_or(0)
        }
        
        pub fn another_function(env: &Env) {
            let mut vec = Vec::new(&env);
            for i in 0..10 {
                vec.push_back(i);
            }
        }
    "#);
    
    let mut functions_to_analyze = Vec::new(&env);
    functions_to_analyze.push_back(String::from_str(&env, "test_function"));
    functions_to_analyze.push_back(String::from_str(&env, "another_function"));
    
    let result = GasAnalyzer::analyze_contract_gas(
        env.clone(),
        contract_address,
        source_code,
        functions_to_analyze
    );
    
    // Should analyze both functions
    assert_eq!(result.function_profiles.len(), 2);
    assert!(result.total_gas_consumed > 0);
    assert!(result.optimization_score >= 0.0);
    assert!(result.optimization_score <= 100.0);
}

#[test]
fn test_optimization_report_generation() {
    let env = Env::default();
    let admin = Address::generate(&env);
    OptimizationReport::initialize(env.clone(), admin.clone());
    
    let contract_address = Address::generate(&env);
    
    // Create mock gas analysis result
    let gas_analysis = GasAnalysisResult {
        contract_address: contract_address.clone(),
        total_gas_consumed: 100000,
        function_profiles: Vec::new(&env),
        overall_breakdown: crate::optimization::gas_analyzer::GasBreakdown {
            storage_operations: 30000,
            computation_operations: 40000,
            memory_operations: 20000,
            external_calls: 5000,
            event_emissions: 3000,
            base_transaction: 21000,
        },
        optimization_score: 75.5,
        critical_gas_consumers: Vec::new(&env),
        recommendations: Vec::new(&env),
        analysis_timestamp: env.ledger().timestamp(),
    };
    
    // Create mock refactor result
    let refactor_result = RefactorResult {
        success: true,
        original_code: String::from_str(&env, "original code"),
        refactored_code: String::from_str(&env, "optimized code"),
        applied_rules: Vec::new(&env),
        total_gas_savings: 35000,
        risk_score: 3.5,
        compilation_status: true,
        warnings: Vec::new(&env),
    };
    
    let report = OptimizationReport::generate_report(
        env.clone(),
        contract_address,
        gas_analysis,
        refactor_result,
        0.05 // $0.05 per gas unit
    );
    
    // Verify report structure
    assert!(report.report_id > 0);
    assert!(report.summary.total_gas_saved > 0);
    assert!(report.summary.gas_reduction_percentage > 0.0);
    assert!(report.summary.compilation_success);
}

#[test]
fn test_35_percent_gas_reduction_target() {
    let env = Env::default();
    let admin = Address::generate(&env);
    AutoRefactor::initialize(env.clone(), admin.clone());
    
    // Create code with significant optimization potential
    let source_code = String::from_str(&env, r#"
        pub fn high_gas_function(env: &Env) {
            // Multiple persistent storage operations
            env.storage().persistent().set(&key1, &val1);
            env.storage().persistent().set(&key2, &val2);
            env.storage().persistent().set(&key3, &val3);
            env.storage().persistent().set(&key4, &val4);
            env.storage().persistent().set(&key5, &val5);
            
            // Inefficient loop
            for i in 0..5 {
                let mut vec = Vec::new(&env);
                vec.push_back(i);
                vec.push_back(i * 2);
                vec.push_back(i * 3);
            }
            
            // String cloning
            let text = String::from_str(&env, "hello");
            let cloned = text.clone();
            let cloned_again = cloned.clone();
            
            // Redundant operations
            if true {
                process();
            }
        }
    "#);
    
    let result = AutoRefactor::auto_refactor(
        env.clone(),
        source_code,
        0.35, // Target 35% reduction
        8     // Higher risk tolerance for testing
    );
    
    // Should achieve at least 35% gas reduction
    let original_metrics = AutoRefactor::analyze_code(env.clone(), result.original_code);
    let reduction_percentage = (result.total_gas_savings as f64 / original_metrics.estimated_gas as f64) * 100.0;
    
    assert!(reduction_percentage >= 35.0, 
           "Expected >=35%% reduction, got {:.2}%%", reduction_percentage);
    assert!(result.success);
    assert!(result.compilation_status);
}

#[test]
fn test_integration_ai_optimizer_with_gas_analyzer() {
    let env = Env::default();
    let admin = Address::generate(&env);
    
    // Initialize all components
    AIOptimizer::initialize(env.clone(), admin.clone());
    GasAnalyzer::initialize(env.clone(), admin.clone());
    
    let contract_address = Address::generate(&env);
    let source_code = String::from_str(&env, r#"
        pub fn integrated_function(env: &Env, data: Vec<u64>) -> u64 {
            let mut sum = 0;
            env.storage().persistent().set(&sum_key, &sum);
            
            for i in 0..data.len() {
                sum += data.get(i).unwrap_or(0);
                env.storage().persistent().set(&sum_key, &sum);
            }
            
            let result = sum * 2;
            env.storage().persistent().set(&result_key, &result);
            result
        }
    "#);
    
    // First analyze with gas analyzer
    let mut functions = Vec::new(&env);
    functions.push_back(String::from_str(&env, "integrated_function"));
    
    let gas_analysis = GasAnalyzer::analyze_contract_gas(
        env.clone(),
        contract_address.clone(),
        source_code.clone(),
        functions
    );
    
    // Then optimize with AI optimizer
    let ai_result = AIOptimizer::analyze_and_optimize(
        env.clone(),
        source_code,
        String::from_str(&env, "integrated_function")
    );
    
    // Verify both provide consistent results
    assert!(gas_analysis.total_gas_consumed > 0);
    assert!(ai_result.original_gas > 0);
    assert!(ai_result.gas_reduction > 0.0);
    
    // AI should identify optimization opportunities
    assert!(ai_result.applied_patterns.len() > 0);
}

#[test]
fn test_learning_system_improvement() {
    let env = Env::default();
    let admin = Address::generate(&env);
    AIOptimizer::initialize(env.clone(), admin.clone());
    
    let source_code = String::from_str(&env, r#"
        pub fn learning_test(env: &Env) {
            env.storage().persistent().set(&key, &value);
        }
    "#);
    
    // Run optimization multiple times to improve learning
    for _ in 0..5 {
        let result = AIOptimizer::analyze_and_optimize(
            env.clone(),
            source_code.clone(),
            String::from_str(&env, "learning_test")
        );
        
        // Check pattern stats after each optimization
        if let Some(learning_data) = AIOptimizer::get_pattern_stats(env.clone(), 1) {
            assert!(learning_data.usage_count > 0);
            assert!(learning_data.success_rate >= 0.0);
            assert!(learning_data.success_rate <= 1.0);
        }
    }
    
    // Verify learning data is being collected
    let history = AIOptimizer::get_optimization_history(env.clone());
    assert!(history.len() >= 5);
}

#[test]
fn test_risk_assessment() {
    let env = Env::default();
    let admin = Address::generate(&env);
    AutoRefactor::initialize(env.clone(), admin.clone());
    
    let source_code = String::from_str(&env, r#"
        pub fn risk_test(env: &Env) {
            // High risk operations
            if true { // Redundant check
                env.storage().persistent().set(&key, &value);
            }
            
            // Complex nested logic
            if condition1 {
                if condition2 {
                    if condition3 {
                        process();
                    }
                }
            }
        }
    "#);
    
    // Test with low risk tolerance
    let low_risk_result = AutoRefactor::auto_refactor(
        env.clone(),
        source_code.clone(),
        0.2,
        3 // Low risk tolerance
    );
    
    // Test with high risk tolerance
    let high_risk_result = AutoRefactor::auto_refactor(
        env.clone(),
        source_code,
        0.4,
        9 // High risk tolerance
    );
    
    // High risk tolerance should apply more optimizations
    assert!(high_risk_result.applied_rules.len() >= low_risk_result.applied_rules.len());
    assert!(high_risk_result.risk_score >= low_risk_result.risk_score);
}

#[test]
fn test_compilation_verification() {
    let env = Env::default();
    let admin = Address::generate(&env);
    AutoRefactor::initialize(env.clone(), admin.clone());
    
    // Valid code
    let valid_code = String::from_str(&env, r#"
        pub fn valid_function() -> u64 {
            let x = 42;
            x * 2
        }
    "#);
    
    // Invalid code (unbalanced braces)
    let invalid_code = String::from_str(&env, r#"
        pub fn invalid_function() -> u64 {
            let x = 42;
            x * 2
        // Missing closing brace
    "#);
    
    let valid_result = AutoRefactor::auto_refactor(
        env.clone(),
        valid_code,
        0.1,
        5
    );
    
    let invalid_result = AutoRefactor::auto_refactor(
        env.clone(),
        invalid_code,
        0.1,
        5
    );
    
    // Valid code should compile successfully
    assert!(valid_result.compilation_status);
    
    // Invalid code should fail compilation
    assert!(!invalid_result.compilation_status);
}
