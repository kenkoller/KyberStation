// ─────────────────────────────────────────────────────────────────────────────
// KyberStation build: Proffieboard V2 — standard
// See firmware-configs/README.md for rationale.
// ─────────────────────────────────────────────────────────────────────────────

#ifdef CONFIG_TOP
#include "proffieboard_v2_config.h"

#define NUM_BLADES 1
#define NUM_BUTTONS 2
#define VOLUME 1500
const unsigned int maxLedsPerStrip = 144;

#define ENABLE_AUDIO
#define ENABLE_MOTION
#define ENABLE_WS2811
#define ENABLE_SD

#define FETT263_EDIT_MODE_MENU
#define ENABLE_ALL_EDIT_OPTIONS
#define FETT263_MULTI_PHASE
#define CLASH_THRESHOLD_G 3.0

#define SHARED_POWER_PINS
#define SAVE_STATE
#endif

#ifdef CONFIG_PROP
#include "../props/saber_fett263_buttons.h"
#endif

#ifdef CONFIG_PRESETS
Preset presets[] = {
  { "font1", "",
    StylePtr<InOutTrL<TrWipe<300>, TrWipeIn<500>, Blue>>(),
    "KyberStation" }
};

BladeConfig blades[] = {
  { 0,
    WS281XBladePtr<144, bladePin, Color8::GRB, PowerPINS<bladePowerPin2, bladePowerPin3>>(),
    CONFIGARRAY(presets)
  }
};
#endif

#ifdef CONFIG_BUTTONS
Button PowerButton(BUTTON_POWER, powerButtonPin, "pow");
Button AuxButton(BUTTON_AUX, auxPin, "aux");
#endif
