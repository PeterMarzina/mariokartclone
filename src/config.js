// Central tweakables for the whole game.

export const N          = 400;          // centerline samples around the loop
export const ROAD_HALF  = 11;           // half road width
export const WALL_OFF   = 11.7;         // wall distance from center
export const WALL_H     = 2.5;          // wall height
export const MAX_LAT    = ROAD_HALF - 0.8; // drivable lateral limit
export const TOTAL_LAPS = 3;

export const CAMERA_DISTANCE = 9;
export const CAMERA_HEIGHT   = 4;

// Mario Kart toy model (3DS rip). If the kart faces backwards/sideways,
// change PLAYER_MODEL_FACING to 0, Math.PI/2 or -Math.PI/2.
export const PLAYER_MODEL_PATH   = 'models/mario-kart/F2_Item_Kart_Mario_S.dae';
export const PLAYER_MODEL_FACING = 0;
export const PLAYER_MODEL_LENGTH = 2.6; // world units the model is scaled to

// AI karts: MK64 pipe-frame models (Luigi + Yoshi). Model by fznmeatpopsicle.
// If the AI karts face the wrong way, change AI_MODEL_FACING (0, ±Math.PI/2, Math.PI).
export const AI_MODEL_PATHS = [
  'models/mk64-kart/pipeframe64_luigi.dae',
  'models/mk64-kart/pipeframe64_yoshi.dae'
];
export const AI_MODEL_FACING = 0;
export const AI_MODEL_LENGTH = 2.8;
