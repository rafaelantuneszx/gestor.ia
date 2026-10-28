"use client";

// Acabamento de imagem em telas grandes: sombra de contato entre os objetos (N8AO), um brilho leve nas
// telas e luminárias, o mapeamento de tons (ACES) e uma vinheta suave. Sem SoftShadows: o PCSS travava a
// primeira imagem por mais de 15 s enquanto compilava.
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

export function Efeitos() {
  return (
    // sem multisampling (4x custava caro em tela grande); o SMAA suaviza as bordas por bem menos
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.6} distanceFalloff={0.6} intensity={2.4} quality="medium" halfRes />
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.4} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.42} />
      <SMAA />
    </EffectComposer>
  );
}
