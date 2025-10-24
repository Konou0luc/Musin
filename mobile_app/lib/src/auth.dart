import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class AuthModel extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();
  String? _token;

  bool get isAuthenticated => _token != null;

  String? get token => _token;

  static const String backendBaseUrl = String.fromEnvironment(
    'BACKEND_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  Future<void> load() async {
    _token = await _storage.read(key: 'jwt');
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final uri = Uri.parse('$backendBaseUrl/api/auth/login');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Échec de connexion');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    _token = data['token'] as String?;
    if (_token == null) throw Exception('Token manquant');
    await _storage.write(key: 'jwt', value: _token);
    notifyListeners();
  }

  Future<void> register(String email, String password) async {
    final uri = Uri.parse('$backendBaseUrl/api/auth/register');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode != 201) {
      throw Exception(jsonDecode(res.body)['error'] ?? "Échec d'inscription");
    }
  }

  Future<void> logout() async {
    _token = null;
    await _storage.delete(key: 'jwt');
    notifyListeners();
  }
}
