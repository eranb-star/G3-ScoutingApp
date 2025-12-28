import 'package:flutter/material.dart';
import 'data/local/drift/app_db.dart';
import 'features/scouting/scouting_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const G3App());
}

class G3App extends StatelessWidget {
  const G3App({super.key});

  @override
  Widget build(BuildContext context) {
    final db = AppDb();
    return MaterialApp(
      title: 'G3 Scouting',
      theme: ThemeData(useMaterial3: true),
      home: HomeScreen(db: db),
    );
  }
}

class HomeScreen extends StatelessWidget {
  final AppDb db;
  const HomeScreen({super.key, required this.db});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('G3 Scouting (Starter)')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Starter app: saves a scouting entry offline to SQLite (Drift).'),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ScoutingScreen(
                    db: db,
                    eventId: 'demo-event',
                    matchId: 'qm1',
                    teamNumber: 1234,
                    deviceId: 'demo-device',
                  ),
                ),
              ),
              child: const Text('Open scouting screen'),
            )
          ],
        ),
      ),
    );
  }
}
