import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { login, register } = useAuth();

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      console.warn('[LoginScreen] Login error', error);
      setErrorMsg('Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setErrorMsg(null);
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setErrorMsg('Please enter your email and password');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(trimmed, password);
    } catch (error: any) {
      console.warn('[LoginScreen] Register error', error);
      setErrorMsg('Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>EVENGAGE</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Create a New Account' : 'Standalone Development Mode'}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder={isSignUp ? 'Min 8 characters' : 'Enter your password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={isSignUp ? handleSignUp : handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? (isSignUp ? 'Creating Account...' : 'Logging in...')
              : (isSignUp ? 'Create Account' : 'Login')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} disabled={loading}>
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Login'
              : "Don't have an account? Create one"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 48,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleText: {
    fontSize: 14,
    color: '#7f1d1d',
    textAlign: 'center',
    marginTop: 20,
  },
});
