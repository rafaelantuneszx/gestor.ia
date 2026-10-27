"use client";

// Acabamento de imagem em telas grandes: sombra de contato entre os objetos (N8AO), um brilho leve nas
// telas e luminárias, o mapeamento de tons e uma vinheta suave. Sem SoftShadows: o PCSS travava a
// primeira imagem por mais de 15 s enquanto compilava.
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

export function Efeitos() {
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={0.55} distanceFalloff={0.5} intensity={2.2} quality="medium" halfRes />
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.2} intensity={0.35} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.28} darkness={0.42} />
    </EffectComposer>
  );
}
