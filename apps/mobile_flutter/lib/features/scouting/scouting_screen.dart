import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../../data/local/drift/app_db.dart';

class ScoutingScreen extends StatefulWidget {
  final AppDb db;
  final String eventId;
  final String matchId;
  final int teamNumber;
  final String deviceId;

  const ScoutingScreen({
    super.key,
    required this.db,
    required this.eventId,
    required this.matchId,
    required this.teamNumber,
    required this.deviceId,
  });

  @override
  State<ScoutingScreen> createState() => _ScoutingScreenState();
}

class _ScoutingScreenState extends State<ScoutingScreen> {
  int autoScore = 0;
  int autoFail = 0;
  int cycles = 0;
  int scoreSuccess = 0;
  int scoreFail = 0;
  bool crossedLine = false;
  bool playedDefense = false;
  bool died = false;
  bool brownout = false;
  bool commsIssue = false;
  String endState = 'NONE';
  final notesCtrl = TextEditingController();

  Widget _counter(String label, int v, VoidCallback dec, VoidCallback inc) {
    return Row(
      children: [
        Expanded(child: Text(label)),
        IconButton(onPressed: dec, icon: const Icon(Icons.remove_circle_outline)),
        Text('$v', style: const TextStyle(fontWeight: FontWeight.bold)),
        IconButton(onPressed: inc, icon: const Icon(Icons.add_circle_outline)),
      ],
    );
  }

  Future<void> _submit() async {
    final id = const Uuid().v4();
    final data = {
      "autoScore": autoScore,
      "autoFail": autoFail,
      "crossedLine": crossedLine,
      "cycles": cycles,
      "scoreSuccess": scoreSuccess,
      "scoreFail": scoreFail,
      "playedDefense": playedDefense,
      "endState": endState,
      "died": died,
      "brownout": brownout,
      "commsIssue": commsIssue,
    };

    await widget.db.upsertEntry(ScoutEntriesCompanion.insert(
      id: id,
      eventId: widget.eventId,
      matchId: widget.matchId,
      teamNumber: widget.teamNumber,
      status: 'SUBMITTED',
      retryCount: const Value(0),
      createdAt: DateTime.now(),
      deviceId: widget.deviceId,
      dataJson: jsonEncode(data),
      notes: notesCtrl.text.trim().isEmpty ? const Value(null) : Value(notesCtrl.text.trim()),
    ));

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved offline ✅')));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Scouting ${widget.matchId} / ${widget.teamNumber}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('AUTO', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          _counter('Auto Score', autoScore, () => setState(()=>autoScore=(autoScore-1).clamp(0,999)), ()=>setState(()=>autoScore++)),
          _counter('Auto Fail', autoFail, () => setState(()=>autoFail=(autoFail-1).clamp(0,999)), ()=>setState(()=>autoFail++)),
          SwitchListTile(title: const Text('Crossed Line'), value: crossedLine, onChanged: (v)=>setState(()=>crossedLine=v)),
          const SizedBox(height: 12),
          const Text('TELEOP', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          _counter('Cycles', cycles, () => setState(()=>cycles=(cycles-1).clamp(0,999)), ()=>setState(()=>cycles++)),
          _counter('Score Success', scoreSuccess, () => setState(()=>scoreSuccess=(scoreSuccess-1).clamp(0,999)), ()=>setState(()=>scoreSuccess++)),
          _counter('Score Fail', scoreFail, () => setState(()=>scoreFail=(scoreFail-1).clamp(0,999)), ()=>setState(()=>scoreFail++)),
          SwitchListTile(title: const Text('Played Defense'), value: playedDefense, onChanged: (v)=>setState(()=>playedDefense=v)),
          const SizedBox(height: 12),
          const Text('ENDGAME', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          DropdownButtonFormField<String>(
            value: endState,
            items: const [
              DropdownMenuItem(value: 'NONE', child: Text('NONE')),
              DropdownMenuItem(value: 'PARK', child: Text('PARK')),
              DropdownMenuItem(value: 'HANG', child: Text('HANG')),
              DropdownMenuItem(value: 'LEVEL', child: Text('LEVEL')),
            ],
            onChanged: (v)=>setState(()=>endState=v ?? 'NONE'),
          ),
          const SizedBox(height: 12),
          const Text('RELIABILITY', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SwitchListTile(title: const Text('Died'), value: died, onChanged: (v)=>setState(()=>died=v)),
          SwitchListTile(title: const Text('Brownout'), value: brownout, onChanged: (v)=>setState(()=>brownout=v)),
          SwitchListTile(title: const Text('Comms Issue'), value: commsIssue, onChanged: (v)=>setState(()=>commsIssue=v)),
          const SizedBox(height: 12),
          const Text('Notes (post-match only)', style: TextStyle(fontWeight: FontWeight.bold)),
          TextField(controller: notesCtrl, minLines: 2, maxLines: 4, decoration: const InputDecoration(border: OutlineInputBorder())),
          const SizedBox(height: 16),
          ElevatedButton.icon(onPressed: _submit, icon: const Icon(Icons.check), label: const Text('Submit'))
        ],
      ),
    );
  }
}
