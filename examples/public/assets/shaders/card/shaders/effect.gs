Shader "/Shader/effect.gs" {
     EditorProperties {
            material_BaseTexture("Texture", Texture2D);
          }

        SubShader "Default" {
          Pass "Pass0" {
          BlendState  blendState{
              Enabled = true;
              SourceColorBlendFactor = BlendFactor.SourceAlpha;
              DestinationColorBlendFactor = BlendFactor.OneMinusSourceAlpha;
              SourceAlphaBlendFactor = BlendFactor.One;
              DestinationAlphaBlendFactor = BlendFactor.OneMinusSourceAlpha;
            }
            BlendState = blendState;
            RenderQueueType = Transparent;

            struct Attributes {
                vec3 POSITION;
                vec2 TEXCOORD_0;
            };
            struct Varyings {
                vec2 uv;
            };
            #include "Common.glsl"
            #include "Transform.glsl"

            sampler2D material_BaseTexture;
            vec4 scene_ElapsedTime;

            VertexShader = vert;
            FragmentShader = frag;

            Varyings vert(Attributes attr) {
              Varyings v;
              vec4 position = vec4(attr.POSITION, 1.0);
              v.uv = attr.TEXCOORD_0;
              gl_Position = renderer_MVPMat * position;
              return v;
            }

            void frag(Varyings v) {
              vec3 pDirWS = normalize(-camera_Forward);
              vec3 RightDir = normalize( (mat4(renderer_ModelMat ) * vec4( 1.0,0.0,0.0,0.0)).rgb);
              float AbsPV = abs( dot(pDirWS , RightDir));
              float Angles  =  cos( radians(70.0) );
              float IncludedAngle = cos(radians(80.0) );
              float AngleMix =  1.0 - smoothstep( Angles , Angles + IncludedAngle ,AbsPV );
              float Alpah = 1.0- abs( 2.0 *  v.uv.x  - 1.0) ;
              Alpah = smoothstep ( 0.1,0.8,Alpah ) * AngleMix;
              vec4 textureColor = texture2D(material_BaseTexture, v.uv + vec2( 0.0, scene_ElapsedTime.x * 0.3 ) );
              gl_FragColor = vec4(textureColor.rgb  , Alpah * textureColor.a);
            }
          }
        }
      }