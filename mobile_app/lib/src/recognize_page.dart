import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'auth.dart';

class RecognizePage extends StatefulWidget {
  const RecognizePage({super.key});

  @override
  State<RecognizePage> createState() => _RecognizePageState();
}

class _RecognizePageState extends State<RecognizePage> {
  bool _loading = false;
  Map<String, dynamic>? _result;

  Future<void> _pickAndRecognize() async {
    setState(() {
      _result = null;
    });
    final token = context.read<AuthModel>().token;
    if (token == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Veuillez vous connecter.')));
      return;
    }

    final picked = await FilePicker.platform.pickFiles(type: FileType.any);
    if (picked == null || picked.files.isEmpty) return;

    final file = picked.files.first;
    final fileBytes = file.bytes ?? await File(file.path!).readAsBytes();

    setState(() => _loading = true);
    try {
      final uri = Uri.parse('${AuthModel.backendBaseUrl}/api/recognize');
      final req = http.MultipartRequest('POST', uri)
        ..headers['Authorization'] = 'Bearer $token'
        ..files.add(http.MultipartFile.fromBytes('file', fileBytes,
            filename: file.name));

      final streamed = await req.send();
      final body = await streamed.stream.bytesToString();
      if (streamed.statusCode != 200) {
        throw Exception(jsonDecode(body)['error'] ?? 'Échec de reconnaissance');
      }
      final data = jsonDecode(body) as Map<String, dynamic>;
      setState(() => _result = data);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Erreur: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reconnaître une chanson'),
        actions: [
          IconButton(
            onPressed: () => context.read<AuthModel>().logout(),
            icon: const Icon(Icons.logout),
            tooltip: 'Se déconnecter',
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            FilledButton.icon(
              onPressed: _loading ? null : _pickAndRecognize,
              icon: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.audiotrack),
              label: const Text('Choisir un extrait (audio/vidéo)'),
            ),
            const SizedBox(height: 16),
            if (_result != null)
              Expanded(
                child: SingleChildScrollView(
                  child: Text(const JsonEncoder.withIndent('  ').convert(_result)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
