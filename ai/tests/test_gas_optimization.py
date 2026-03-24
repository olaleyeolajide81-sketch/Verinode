"""
Test suite for AI-powered gas optimization module
"""

import unittest
import tempfile
import os
from unittest.mock import Mock, patch
import numpy as np
import pandas as pd

from gas_optimization import GasOptimizerAI, GasPattern, OptimizationResult, CodeFeatures
from pattern_recognition import PatternRecognitionEngine, CodePattern, PatternMatch


class TestGasOptimizerAI(unittest.TestCase):
    """Test cases for GasOptimizerAI class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.optimizer = GasOptimizerAI()
        self.sample_code = """
        pub fn example_function(env: &Env) -> u64 {
            env.storage().persistent().set(&key, &value);
            let mut vec = Vec::new(&env);
            for i in 0..3 {
                vec.push_back(i);
            }
            let result = value * 2;
            env.storage().persistent().get(&key).unwrap_or(0)
        }
        """
    
    def test_initialization(self):
        """Test optimizer initialization"""
        self.assertIsNotNone(self.optimizer.patterns)
        self.assertFalse(self.optimizer.is_trained)
        self.assertEqual(len(self.optimizer.patterns), 0)
    
    def test_pattern_initialization(self):
        """Test pattern initialization"""
        patterns = self.optimizer._initialize_patterns()
        self.assertGreater(len(patterns), 0)
        
        # Check pattern structure
        for pattern in patterns:
            self.assertIsInstance(pattern, GasPattern)
            self.assertGreater(pattern.pattern_id, 0)
            self.assertIsNotNone(pattern.name)
            self.assertIsNotNone(pattern.regex_pattern)
            self.assertGreater(pattern.gas_savings, 0)
            self.assertGreaterEqual(pattern.confidence, 0.0)
            self.assertLessEqual(pattern.confidence, 1.0)
    
    def test_code_feature_extraction(self):
        """Test code feature extraction"""
        features = self.optimizer.extract_code_features(self.sample_code)
        
        self.assertIsInstance(features, CodeFeatures)
        self.assertGreaterEqual(features.storage_operations, 0)
        self.assertGreaterEqual(features.loop_operations, 0)
        self.assertGreaterEqual(features.function_calls, 0)
        self.assertGreaterEqual(features.lines_of_code, 0)
        self.assertGreaterEqual(features.cyclomatic_complexity, 0)
    
    def test_gas_usage_estimation(self):
        """Test gas usage estimation"""
        estimated_gas = self.optimizer.estimate_gas_usage(self.sample_code)
        self.assertIsInstance(estimated_gas, int)
        self.assertGreater(estimated_gas, 0)
    
    def test_pattern_matching(self):
        """Test pattern matching in code"""
        matches = self.optimizer.find_pattern_matches(self.sample_code)
        self.assertIsInstance(matches, list)
        
        for match in matches:
            self.assertIsInstance(match, tuple)
            self.assertEqual(len(match), 3)  # (pattern, matched_text, position)
    
    def test_optimization_application(self):
        """Test applying optimizations to code"""
        result = self.optimizer.apply_optimizations(self.sample_code)
        
        self.assertIsInstance(result, OptimizationResult)
        self.assertGreaterEqual(result.original_gas, 0)
        self.assertGreaterEqual(result.optimized_gas, 0)
        self.assertGreaterEqual(result.gas_savings, 0)
        self.assertGreaterEqual(result.savings_percentage, 0.0)
        self.assertIsInstance(result.applied_patterns, list)
        self.assertGreaterEqual(result.risk_score, 0.0)
        self.assertIsInstance(result.compilation_verified, bool)
    
    def test_35_percent_reduction_target(self):
        """Test achieving 35% gas reduction target"""
        # Create code with high optimization potential
        high_potential_code = """
        pub fn expensive_function(env: &Env) -> u64 {
            env.storage().persistent().set(&key1, &val1);
            env.storage().persistent().set(&key2, &val2);
            env.storage().persistent().set(&key3, &val3);
            env.storage().persistent().set(&key4, &val4);
            env.storage().persistent().set(&key5, &val5);
            
            let mut vec = Vec::new(&env);
            for i in 0..5 {
                vec.push_back(i);
                vec.push_back(i * 2);
                vec.push_back(i * 3);
                vec.push_back(i * 4);
            }
            
            let text = String::from_str(&env, "hello");
            let cloned = text.clone();
            let cloned_again = cloned.clone();
            let final_clone = cloned_again.clone();
            
            if true {
                if true {
                    process();
                }
            }
            
            42
        }
        """
        
        result = self.optimizer.optimize_contract_code(
            high_potential_code, 
            target_gas_reduction=0.35
        )
        
        self.assertGreaterEqual(result.savings_percentage, 35.0,
            f"Expected >=35%% reduction, got {result.savings_percentage:.2f}%")
        self.assertTrue(result.compilation_verified)
        self.assertGreater(len(result.applied_patterns), 0)
    
    def test_risk_assessment(self):
        """Test risk assessment for optimizations"""
        result = self.optimizer.optimize_contract_code(
            self.sample_code,
            target_gas_reduction=0.2,
            max_risk_level=5
        )
        
        self.assertLessEqual(result.risk_score, 5.0)
    
    def test_learning_system(self):
        """Test learning system improvement"""
        # Simulate multiple optimizations
        for i in range(5):
            result = self.optimizer.optimize_contract_code(
                self.sample_code,
                target_gas_reduction=0.1
            )
            
            # Update learning data
            self.optimizer.update_learning_data(result.applied_patterns, result.success)
        
        # Check that learning data has been updated
        learning_stats = self.optimizer.get_learning_statistics()
        self.assertGreater(learning_stats['total_optimizations'], 0)
        self.assertGreater(learning_stats['success_rate'], 0.0)
    
    def test_model_training(self):
        """Test ML model training"""
        # Create synthetic training data
        training_data = []
        for i in range(100):
            features = CodeFeatures(
                storage_operations=np.random.randint(0, 10),
                loop_operations=np.random.randint(0, 5),
                function_calls=np.random.randint(1, 20),
                arithmetic_operations=np.random.randint(0, 50),
                string_operations=np.random.randint(0, 10),
                vector_operations=np.random.randint(0, 15),
                conditional_statements=np.random.randint(0, 20),
                lines_of_code=np.random.randint(10, 200),
                cyclomatic_complexity=np.random.randint(1, 50)
            )
            gas_usage = np.random.randint(10000, 100000)
            training_data.append((features, gas_usage))
        
        # Train the model
        self.optimizer.train_gas_prediction_model(training_data)
        self.assertTrue(self.optimizer.is_trained)
    
    def test_compilation_verification(self):
        """Test compilation verification"""
        # Valid code
        valid_code = "pub fn valid_fn() -> u64 { 42 }"
        is_valid = self.optimizer.verify_compilation(valid_code)
        self.assertTrue(is_valid)
        
        # Invalid code (unbalanced braces)
        invalid_code = "pub fn invalid_fn() -> u64 { 42"
        is_invalid = self.optimizer.verify_compilation(invalid_code)
        self.assertFalse(is_invalid)


class TestPatternRecognitionEngine(unittest.TestCase):
    """Test cases for PatternRecognitionEngine class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.engine = PatternRecognitionEngine()
        self.sample_code = """
        pub fn pattern_test(env: &Env) {
            env.storage().persistent().set(&key, &value);
            let mut vec = Vec::new(&env);
            vec.push_back(item);
            for i in 0..3 {
                process(i);
            }
        }
        """
    
    def test_initialization(self):
        """Test engine initialization"""
        self.assertIsNotNone(self.engine.patterns)
        self.assertIsNotNone(self.engine.vectorizer)
        self.assertFalse(self.engine.is_trained)
    
    def test_pattern_discovery(self):
        """Test automatic pattern discovery"""
        patterns = self.engine.discover_patterns(self.sample_code)
        self.assertIsInstance(patterns, list)
        
        for pattern in patterns:
            self.assertIsInstance(pattern, CodePattern)
            self.assertIsNotNone(pattern.pattern_id)
            self.assertIsNotNone(pattern.name)
            self.assertIsNotNone(pattern.category)
            self.assertGreater(pattern.frequency, 0)
    
    def test_pattern_matching(self):
        """Test pattern matching in code"""
        # Add some patterns first
        self.engine.add_pattern(
            "storage_pattern",
            "Storage Optimization",
            "Storage",
            r"env\.storage\(\)\.persistent\(\)\.set",
            "Storage usage pattern",
            5
        )
        
        matches = self.engine.find_patterns_in_code(self.sample_code)
        self.assertIsInstance(matches, list)
        
        for match in matches:
            self.assertIsInstance(match, PatternMatch)
            self.assertIsNotNone(match.pattern)
            self.assertGreaterEqual(match.start_line, 0)
            self.assertGreaterEqual(match.end_line, match.start_line)
            self.assertGreater(match.confidence, 0.0)
    
    def test_pattern_clustering(self):
        """Test pattern clustering"""
        # Create multiple similar patterns
        patterns = [
            "env.storage().persistent().set(&key, &value)",
            "env.storage().persistent().set(&data, &info)",
            "env.storage().persistent().set(&item, &result)",
            "let mut vec = Vec::new(&env)",
            "let mut list = Vec::new(&env)",
        ]
        
        clusters = self.engine.cluster_similar_patterns(patterns)
        self.assertIsInstance(clusters, list)
        
        for cluster in clusters:
            self.assertIsNotNone(cluster.cluster_id)
            self.assertGreater(len(cluster.patterns), 0)
            self.assertGreater(cluster.similarity_score, 0.0)
    
    def test_learning_from_feedback(self):
        """Test learning from optimization feedback"""
        # Simulate optimization feedback
        feedback_data = [
            {"pattern_id": "storage_pattern", "success": True, "gas_savings": 3000},
            {"pattern_id": "storage_pattern", "success": True, "gas_savings": 2500},
            {"pattern_id": "loop_pattern", "success": False, "gas_savings": 0},
            {"pattern_id": "storage_pattern", "success": True, "gas_savings": 2800},
        ]
        
        for feedback in feedback_data:
            self.engine.update_pattern_learning(feedback)
        
        # Check learning metrics
        metrics = self.engine.get_learning_metrics()
        self.assertGreater(metrics.total_patterns_learned, 0)
        self.assertGreater(metrics.successful_optimizations, 0)
        self.assertGreater(metrics.accuracy_score, 0.0)
    
    def test_pattern_similarity_analysis(self):
        """Test pattern similarity analysis"""
        code_snippets = [
            "env.storage().persistent().set(&key, &value)",
            "env.storage().instance().set(&key, &value)",
            "let mut vec = Vec::new(&env)",
            "vec.push_back(item)",
        ]
        
        similarity_matrix = self.engine.analyze_pattern_similarity(code_snippets)
        self.assertIsInstance(similarity_matrix, np.ndarray)
        self.assertEqual(similarity_matrix.shape, (len(code_snippets), len(code_snippets)))
    
    def test_optimization_suggestion_generation(self):
        """Test optimization suggestion generation"""
        suggestions = self.engine.generate_optimization_suggestions(self.sample_code)
        self.assertIsInstance(suggestions, list)
        
        for suggestion in suggestions:
            self.assertIn('pattern', suggestion)
            self.assertIn('suggestion', suggestion)
            self.assertIn('gas_savings', suggestion)
            self.assertIn('confidence', suggestion)
    
    def test_pattern_evolution(self):
        """Test pattern evolution over time"""
        # Simulate pattern evolution
        initial_patterns = self.engine.discover_patterns(self.sample_code)
        
        # Add more code and discover new patterns
        more_code = """
        pub fn evolved_function(env: &Env) {
            env.storage().instance().set(&key, &value);
            let mut vec = Vec::new(&env);
            vec.reserve_exact(10);
            for i in 0..5 {
                vec.push_back(i * 2);
            }
        }
        """
        
        evolved_patterns = self.engine.discover_patterns(more_code)
        
        # Should discover new or evolved patterns
        self.assertGreaterEqual(len(evolved_patterns), len(initial_patterns))
    
    def test_cross_pattern_analysis(self):
        """Test analysis of pattern interactions"""
        code_with_multiple_patterns = """
        pub fn complex_function(env: &Env) {
            env.storage().persistent().set(&key1, &val1);
            env.storage().persistent().set(&key2, &val2);
            
            let mut vec = Vec::new(&env);
            for i in 0..3 {
                vec.push_back(i);
                if i > 1 {
                    env.storage().persistent().set(&key3, &i);
                }
            }
        }
        """
        
        interactions = self.engine.analyze_pattern_interactions(code_with_multiple_patterns)
        self.assertIsInstance(interactions, dict)
        
        for interaction_key, interaction_data in interactions.items():
            self.assertIn('patterns', interaction_data)
            self.assertIn('interaction_type', interaction_data)
            self.assertIn('combined_gas_impact', interaction_data)


class TestIntegration(unittest.TestCase):
    """Integration tests for the complete gas optimization system"""
    
    def setUp(self):
        """Set up integration test fixtures"""
        self.optimizer = GasOptimizerAI()
        self.pattern_engine = PatternRecognitionEngine()
    
    def test_end_to_end_optimization(self):
        """Test complete optimization pipeline"""
        complex_code = """
        pub fn complex_contract_function(env: &Env, data: Vec<u64>) -> u64 {
            // Multiple storage operations
            env.storage().persistent().set(&count_key, &data.len());
            env.storage().persistent().set(&data_key, &data);
            
            // Inefficient processing
            let mut sum = 0;
            for i in 0..data.len() {
                let item = data.get(i).unwrap_or(0);
                sum += item;
                env.storage().persistent().set(&sum_key, &sum);
            }
            
            // String operations
            let result_str = String::from_str(&env, "result");
            let formatted = format_string(&env, &result_str, &sum);
            let cloned_str = formatted.clone();
            
            // Vector operations
            let mut results = Vec::new(&env);
            for i in 0..sum {
                results.push_back(i * 2);
            }
            
            sum
        }
        """
        
        # Step 1: Pattern recognition
        patterns = self.pattern_engine.discover_patterns(complex_code)
        self.assertGreater(len(patterns), 0)
        
        # Step 2: Gas optimization
        result = self.optimizer.optimize_contract_code(
            complex_code,
            target_gas_reduction=0.35
        )
        
        # Verify results
        self.assertGreaterEqual(result.savings_percentage, 35.0)
        self.assertTrue(result.compilation_verified)
        self.assertGreater(len(result.applied_patterns), 0)
        
        # Step 3: Learning update
        self.optimizer.update_learning_data(result.applied_patterns, True)
        self.pattern_engine.update_pattern_learning({
            'pattern_id': 'integration_test',
            'success': True,
            'gas_savings': result.gas_savings
        })
    
    def test_performance_requirements(self):
        """Test performance requirements"""
        large_code = self._generate_large_contract_code()
        
        import time
        start_time = time.time()
        
        result = self.optimizer.optimize_contract_code(
            large_code,
            target_gas_reduction=0.35
        )
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should complete within reasonable time
        self.assertLess(processing_time, 5.0)  # 5 seconds max
        self.assertGreaterEqual(result.savings_percentage, 35.0)
    
    def _generate_large_contract_code(self):
        """Generate large contract code for performance testing"""
        code_lines = ["pub fn large_contract_function(env: &Env) {"]
        
        for i in range(100):
            code_lines.append(f"    env.storage().persistent().set(&key_{i}, &{i});")
        
        code_lines.append("    let mut vec = Vec::new(&env);")
        
        for i in range(50):
            code_lines.append(f"    vec.push_back({i} * 2);")
        
        code_lines.append("    for i in 0..vec.len() {")
        code_lines.append("        let item = vec.get(i).unwrap_or(0);")
        code_lines.append("        env.storage().persistent().set(&item_key, &item);")
        code_lines.append("    }")
        
        code_lines.append("    42")
        code_lines.append("}")
        
        return "\n".join(code_lines)


if __name__ == '__main__':
    unittest.main()
