#!/usr/bin/env python3
"""
Comprehensive Test Suite for Gas Optimization Suite v2

This script validates:
- AI-powered gas optimization suggestions
- Automated code refactoring for gas efficiency
- Pattern recognition for optimization opportunities
- Gas cost reduction of at least 35%
- Integration between all components
"""

import sys
import os
import json
import time
from pathlib import Path

# Add the AI modules to the path
sys.path.append(str(Path(__file__).parent / "ai"))

try:
    from gas_optimization import GasOptimizerAI, OptimizationResult
    from pattern_recognition import PatternRecognitionEngine, CodePattern
except ImportError as e:
    print(f"Error importing AI modules: {e}")
    print("Please ensure required Python packages are installed:")
    print("pip install numpy pandas scikit-learn regex")
    sys.exit(1)


class GasOptimizationTester:
    """Comprehensive test suite for gas optimization"""
    
    def __init__(self):
        self.optimizer = GasOptimizerAI()
        self.pattern_engine = PatternRecognitionEngine()
        self.test_results = []
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': time.time()
        })
        
        if passed:
            self.passed_tests += 1
        else:
            self.failed_tests += 1
    
    def test_ai_optimization_functionality(self):
        """Test AI-powered gas optimization suggestions"""
        print("\n=== Testing AI Optimization Functionality ===")
        
        # Test case 1: Storage optimization
        storage_code = """
        pub fn storage_heavy(env: Env, data: Bytes) {
            env.storage().persistent().set(&1, &data);
            env.storage().persistent().set(&2, &data);
            env.storage().persistent().set(&3, &data);
            env.storage().persistent().get(&1);
            env.storage().persistent().get(&2);
        }
        """
        
        try:
            result = self.optimizer.optimize_contract_code(storage_code, target_gas_reduction=0.35)
            
            # Should identify storage optimization patterns
            storage_patterns = [p for p in result.applied_patterns if "Storage" in p.category]
            has_storage_optimization = len(storage_patterns) > 0
            
            self.log_test(
                "Storage Pattern Recognition",
                has_storage_optimization,
                f"Found {len(storage_patterns)} storage patterns"
            )
            
            # Should achieve some gas reduction
            has_reduction = result.gas_savings > 0
            self.log_test(
                "Gas Reduction Achievement",
                has_reduction,
                f"Saved {result.gas_savings} gas ({result.savings_percentage:.2f}%)"
            )
            
        except Exception as e:
            self.log_test("AI Optimization Basic Test", False, f"Error: {e}")
    
    def test_35_percent_reduction_requirement(self):
        """Test the 35% gas reduction requirement"""
        print("\n=== Testing 35% Gas Reduction Requirement ===")
        
        # Test case: Highly optimizable code
        inefficient_code = """
        pub fn very_inefficient(env: Env, data: Vec<Bytes>) -> u64 {
            let mut result = 0;
            
            // Multiple persistent storage operations
            env.storage().persistent().set(&1, &data);
            env.storage().persistent().set(&2, &data);
            env.storage().persistent().set(&3, &data);
            env.storage().persistent().set(&4, &data);
            env.storage().persistent().set(&5, &data);
            
            // Inefficient loop
            for i in 0..5 {
                let cloned_data = data.clone();
                result += i * 2;
                env.storage().persistent().set(&i, &cloned_data);
                
                // Nested operations
                for j in 0..3 {
                    let more_cloned = cloned_data.clone();
                    result += j * 2;
                }
            }
            
            // Redundant operations
            if true {
                let another_clone = data.clone();
                result += another_clone.len() as u64;
            }
            
            result
        }
        """
        
        try:
            result = self.optimizer.optimize_contract_code(
                inefficient_code, 
                target_gas_reduction=0.35,
                max_risk_level=8
            )
            
            meets_35_percent = result.savings_percentage >= 35.0
            self.log_test(
                "35% Gas Reduction Target",
                meets_35_percent,
                f"Achieved {result.savings_percentage:.2f}% reduction"
            )
            
            # Additional metrics
            self.log_test(
                "Gas Savings Amount",
                result.gas_savings > 1000,
                f"Saved {result.gas_savings} gas units"
            )
            
            self.log_test(
                "Compilation Verification",
                result.compilation_verified,
                "Optimized code compiles successfully"
            )
            
            self.log_test(
                "Applied Optimizations Count",
                len(result.applied_patterns) > 0,
                f"Applied {len(result.applied_patterns)} optimization patterns"
            )
            
        except Exception as e:
            self.log_test("35% Reduction Test", False, f"Error: {e}")
    
    def test_pattern_recognition(self):
        """Test pattern recognition capabilities"""
        print("\n=== Testing Pattern Recognition ===")
        
        code_with_patterns = """
        pub fn pattern_test(env: Env) {
            // Storage patterns
            env.storage().persistent().set(&key, &value);
            env.storage().instance().set(&key2, &value2);
            
            // Loop patterns
            for i in 0..3 {
                process(i);
            }
            
            // Vector patterns
            let mut vec = Vec::new(&env);
            vec.push_back(item1);
            vec.push_back(item2);
            
            // Arithmetic patterns
            let result = value * 2;
            let doubled = result * 4;
            
            // String patterns
            let cloned_string = original_string.clone();
            process_string(cloned_string);
        }
        """
        
        try:
            # Test pattern identification
            patterns = self.optimizer.identify_optimization_patterns(code_with_patterns)
            
            self.log_test(
                "Pattern Identification",
                len(patterns) > 0,
                f"Found {len(patterns)} optimization patterns"
            )
            
            # Test specific pattern categories
            categories = set(pattern[0].category for pattern in patterns)
            expected_categories = {"Storage", "Loops", "Collections", "Arithmetic", "Strings"}
            found_categories = categories.intersection(expected_categories)
            
            self.log_test(
                "Pattern Categories Coverage",
                len(found_categories) >= 3,
                f"Found patterns in: {', '.join(found_categories)}"
            )
            
            # Test pattern applicability scoring
            features = self.optimizer.extract_code_features(code_with_patterns)
            high_confidence_patterns = [
                pattern for pattern in patterns 
                if pattern[0].confidence > 0.7
            ]
            
            self.log_test(
                "High Confidence Patterns",
                len(high_confidence_patterns) > 0,
                f"Found {len(high_confidence_patterns)} high-confidence patterns"
            )
            
        except Exception as e:
            self.log_test("Pattern Recognition Test", False, f"Error: {e}")
    
    def test_automated_refactoring(self):
        """Test automated code refactoring"""
        print("\n=== Testing Automated Refactoring ===")
        
        refactor_code = """
        pub fn refactor_example(env: Env) {
            // Inefficient storage usage
            env.storage().persistent().set(&1, &data);
            env.storage().persistent().set(&2, &data);
            env.storage().persistent().set(&3, &data);
            
            // Unnecessary cloning
            let cloned = expensive_data.clone();
            process(cloned);
            
            // Inefficient arithmetic
            let result = value * 2;
            let doubled = result * 4;
            
            // Redundant condition
            if true {
                do_something();
            }
        }
        """
        
        try:
            result = self.optimizer.optimize_contract_code(refactor_code)
            
            # Should apply multiple refactoring rules
            multiple_optimizations = len(result.applied_patterns) > 1
            self.log_test(
                "Multiple Refactoring Rules",
                multiple_optimizations,
                f"Applied {len(result.applied_patterns)} refactoring rules"
            )
            
            # Should maintain code validity
            code_valid = result.compilation_verified
            self.log_test(
                "Refactored Code Validity",
                code_valid,
                "Refactored code maintains validity"
            )
            
            # Should have reasonable risk score
            acceptable_risk = result.risk_score <= 7.0
            self.log_test(
                "Acceptable Risk Score",
                acceptable_risk,
                f"Risk score: {result.risk_score:.2f}/10"
            )
            
        except Exception as e:
            self.log_test("Automated Refactoring Test", False, f"Error: {e}")
    
    def test_integration_comprehensive(self):
        """Test comprehensive integration of all components"""
        print("\n=== Testing Comprehensive Integration ===")
        
        complex_contract = """
        pub struct ComplexContract {
            data: Vec<Bytes>,
            config: Map<u32, u64>,
        }
        
        impl ComplexContract {
            pub fn expensive_operation(env: Env, input: Vec<Bytes>) -> u64 {
                let mut result = 0;
                
                // Multiple storage operations
                env.storage().persistent().set(&1, &input);
                env.storage().persistent().set(&2, &input);
                env.storage().persistent().set(&3, &input);
                
                // Complex nested loops
                for i in 0..5 {
                    let cloned_input = input.clone();
                    result += i * 2;
                    
                    for j in 0..3 {
                        let double_cloned = cloned_input.clone();
                        result += j * 4;
                        env.storage().persistent().set(&(i*10 + j), &double_cloned);
                    }
                }
                
                // Vector operations
                let mut vec = Vec::new(&env);
                for item in input.iter() {
                    vec.push_back(item.clone());
                }
                
                // String operations
                let string_data = String::from_str(&env, "hello");
                let cloned_string = string_data.clone();
                process_string(cloned_string);
                
                result
            }
        }
        """
        
        try:
            # Test full optimization pipeline
            start_time = time.time()
            result = self.optimizer.optimize_contract_code(
                complex_contract,
                target_gas_reduction=0.35,
                max_risk_level=7
            )
            optimization_time = time.time() - start_time
            
            # Performance test
            fast_optimization = optimization_time < 5.0
            self.log_test(
                "Optimization Performance",
                fast_optimization,
                f"Optimization completed in {optimization_time:.2f} seconds"
            )
            
            # Effectiveness test
            significant_reduction = result.savings_percentage >= 30.0
            self.log_test(
                "Significant Gas Reduction",
                significant_reduction,
                f"Achieved {result.savings_percentage:.2f}% reduction"
            )
            
            # Quality test
            high_quality = result.compilation_verified and result.risk_score <= 7.0
            self.log_test(
                "Optimization Quality",
                high_quality,
                f"Compilation: {result.compilation_verified}, Risk: {result.risk_score:.2f}"
            )
            
            # Generate comprehensive report
            report = self.optimizer.export_optimization_report(result, "json")
            report_generated = len(report) > 0
            self.log_test(
                "Report Generation",
                report_generated,
                f"Generated {len(report)} character report"
            )
            
        except Exception as e:
            self.log_test("Integration Test", False, f"Error: {e}")
    
    def run_all_tests(self):
        """Run all tests and generate summary"""
        print("🚀 Starting Gas Optimization Suite v2 Comprehensive Tests")
        print("=" * 60)
        
        # Run all test suites
        self.test_ai_optimization_functionality()
        self.test_35_percent_reduction_requirement()
        self.test_pattern_recognition()
        self.test_automated_refactoring()
        self.test_integration_comprehensive()
        
        # Generate summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.passed_tests + self.failed_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests / (self.passed_tests + self.failed_tests) * 100):.1f}%")
        
        # Check if critical requirement is met
        critical_tests = [test for test in self.test_results if "35%" in test['test']]
        critical_passed = all(test['passed'] for test in critical_tests)
        
        if critical_passed:
            print("\n🎉 CRITICAL REQUIREMENT MET: 35% Gas Reduction Achieved!")
        else:
            print("\n⚠️  CRITICAL REQUIREMENT NOT MET: 35% Gas Reduction Failed")
        
        # Save detailed results
        results_file = Path(__file__).parent / "test_results.json"
        with open(results_file, 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        return critical_passed and self.failed_tests == 0


def main():
    """Main test execution"""
    tester = GasOptimizationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Gas Optimization Suite v2 is ready!")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED! Please review the issues above.")
        return 1


if __name__ == "__main__":
    exit(main())
