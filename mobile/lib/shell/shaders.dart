import 'dart:ui' as ui;

/// A fragment program loaded once. [program] stays null until it has loaded,
/// and for good where the platform cannot run it: callers paint their plain
/// fallback meanwhile.
class ShaderAsset {
  ShaderAsset(this.asset);
  final String asset;
  ui.FragmentProgram? program;
  Future<ui.FragmentProgram?>? _loading;

  Future<ui.FragmentProgram?> load() =>
      _loading ??= ui.FragmentProgram.fromAsset(asset)
          .then<ui.FragmentProgram?>((p) => program = p, onError: (_) => null);
}

final meshDriftShader = ShaderAsset('shaders/mesh_drift.frag');
final waveShader = ShaderAsset('shaders/wave.frag');
