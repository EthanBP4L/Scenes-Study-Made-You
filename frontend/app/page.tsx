
import SceneBackground from "../components/SceneBackground";

import NavigationOrb from "../components/NavigationOrb";

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#101018] text-white">

      

{/* GRAPHICAL SCENE BACKGROUND */}
<SceneBackground />



      
{/* VISUAL EFFECTS LAYER */}
<div
  id="scene-effects"
  className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
>
  <div className="scene-light scene-light-one" />
  <div className="scene-light scene-light-two" />
</div>


      {/* MAIN SCENES TITLE */}
      <div
        id="scene-title"
        className="relative z-20 px-6 text-center"
      >
        
        <h1 className="scene-logo text-[clamp(2.5rem,min(14vw,20vh),12rem)] font-black leading-none tracking-[-0.08em]">

          SCENES
        </h1>

        
      </div>

      

{/* NAVIGATION ORB */}
<NavigationOrb />



      {/* EDIT RAINDROP PLACEHOLDER */}
      <div
        id="edit-raindrop"
        className="absolute right-6 top-6 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-xl"
      >
        <span className="text-xl">💧</span>
      </div>

    </main>
  );
}
