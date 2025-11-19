Shader "/Shader/MainPBRShader.gs" {
    Editor {
      Properties{
          Header("Base"){
            material_IOR("IOR", Range(0, 5, 0.01)) = 1.5;
            material_BaseColor("BaseColor", Color) = (1, 1, 1, 1);
            material_BaseTexture("BaseTexture", Texture2D);
          }
          Header("Occlusion Metal Roughness") {
            material_OcclusionIntensity("OcclusionIntensity", Range(0, 5, 0.01)) = 1;
            material_Metal( "Metal", Range(0,1,0.01) ) = 1;
            material_Roughness( "Roughness", Range( 0, 1, 0.01 ) ) = 1;
            material_RoughnessMetallicTexture("RoughnessMetallicTexture", Texture2D);
          }
          Header("Normal") {
            material_NormalTexture("NormalTexture", Texture2D);
            material_NormalIntensity("NormalIntensity", Range(0, 5, 0.01)) = 1;
          }
          Header("Emissive") {
            material_EmissiveColor("EmissiveColor", Color ) = (0, 0, 0, 1);
            material_EmissiveTexture("EmissiveTexture", Texture2D);
          }
          Header("Addtive") {
            material_AddtiveColor("EmissiveColor", Color ) = (0, 0, 0, 1);
            material_Addtivexture("EmissiveTexture", Texture2D);
          }
          Header("Effect"){
            material_Effectcolor("Main Color", Color) = (0, 0, 0, 1);
            material_Efeecttexture("Main Texture", Texture2D);
            material_Effectnoise("Noise Texture", Texture2D);
            material_EffectTilling("Tilling",Vector2 ) = (1.0,1.0);
          }
     }
    Macros {
        MATERIAL_HAS_NORMALTEXTURE("HAS_NORMALTEXTURE");
     }
  }
        SubShader "Default" {
          Pass "Forward Pass" {
            Tags { pipelineStage = "Forward"} 
            #define IS_METALLIC_WORKFLOW
            VertexShader = PBRVertex;
            FragmentShader = PBRFragment;
    
            #include "./GSForwardPassPBR.glsl"
          }
        }
    }
      
      