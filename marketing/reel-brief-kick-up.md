# Reel brief: "Get Midsesh when you kick up"

Regeneration brief for the viral stage-and-fireworks reel, with our line in the
second sky moment.

Target: 14.0s, 1080x1920, 9:16.
Model: Higgsfield, Seedance 2.0 (`seedance_2_0`, Bytedance).

## The one change

Everything about the reference stays. The second time the camera snaps up to
the sky, the sky carries our line instead of only fireworks:

- On the snap up: **Get Midsesh when you kick up**
- Once the rockets pop and fall: **Get Midsesh**

Nothing else in the reel changes.

## Why the reference works

It is one continuous handheld take. There is not a single cut in it. A camera
operator, a lead singer, three dancers and a pyro tech are all hitting the same
cues: the camera whips up at the exact frame the rockets launch, cranes back
down as they fade, and whips up a second time on the final hit of the track.
The reference's own caption says as much ("the sync of dancers + artist +
fireworks tech + videomaker").

Two things follow from that, and they are the whole brief:

1. **The joins must hide inside camera motion.** We cannot generate 14 seconds
   in one pass with three camera moves and keep control, so we generate four
   segments. Every join lands inside a whip blur or a smoke wipe, so the finished
   piece still reads as one take.
2. **The camera cuts to the music, not to the fireworks.** See the energy map
   below. The camera is in the sky during the breakdown and lands back on stage
   on the re-drop. Get that wrong and the clip feels like stock footage.

## Timing map, measured from the reference

| Time | Shot | What happens |
| --- | --- | --- |
| 0.00 - 1.90 | **A. Stage** | Handheld mid-wide from the photo pit. Singer center, three dancers behind her, pink and white haze. Caption overlay top third. |
| 1.90 - 2.05 | **Whip up** | Violent vertical whip, about 8 frames, heavy motion blur. Motivated by the launch cue. |
| 2.05 - 3.90 | **B. Sky one** | Three rockets climbing on parallel diagonals, gold sparking tails, grey smoke trails. Festival gantry in the bottom fifth. Upper two thirds is empty black. |
| 3.90 - 5.15 | **Tilt down** | Continuous crane and tilt down, not a whip. The gantry sign passes through frame, red pyro smoke fills everything, the stage rises in from the bottom. |
| 5.15 - 11.00 | **C. Stage** | Handheld mid-shot. Choreography, CO2 jets, smoke shifting white to peach to red. The longest shot in the piece. |
| 11.00 - 11.15 | **Whip up two** | She throws the mic arm straight up, a sparkler fountain ignites beside her, the camera snaps up. |
| 11.15 - 13.98 | **D. Sky two** | Rockets climb, arc over, pop from gold to red at about 12.85, fall as red embers with fizzing tails, fade to near black. **This is where our text lives.** |

## Energy map of the reference track

Measured loudness in 100ms windows. Any replacement track needs this shape or
the camera moves stop meaning anything.

- **0.0 to 3.6s** full energy, chorus running.
- **3.7 to 4.9s** drops roughly 45 percent, breakdown. The camera is in the sky
  through all of it.
- **5.0s** back to full on a hard re-entry. The camera lands on the stage on
  this exact hit.
- **6.6 to 10.9s** syncopated, percussive stabs at 7.3, 7.7, 8.1, 8.8, 9.5,
  10.3 and 10.8.
- **11.0s** final drop, sustained loud through 13.0. The second whip up rides
  this.
- **13.5 to 14.0s** decay under the falling embers.

## Generation settings

Identical for all four segments:

| Parameter | Value | Note |
| --- | --- | --- |
| model | `seedance_2_0` | Seedance 2.0, Bytedance |
| aspect_ratio | `9:16` | |
| duration | `4` | 4 is the model minimum, 15 the max |
| resolution | `1080p` | |
| mode | `std` | 1080p and 4k require std, fast tops out at 720p |
| bitrate_mode | `high` | the pyro sparks fall apart at standard bitrate |
| genre | `auto` | | 
| generate_audio | `false` | native audio will fight the music bed |

Four segments at 4s gives 16s of material for a 14s cut. The overlap is
deliberate, it buys you a frame or two of slack at each join.

**Chain the segments.** Seedance 2.0 accepts `start_image`, `end_image`,
`image_references`, `video_references` and `audio_references`. Pin both ends of
every segment: the `end_image` of segment N is the `start_image` of segment
N+1. That is what holds continuity across the joins.

**Optional but recommended:** pass the reference clip as `video_references` on
segments 1 and 3 to lock the whip timing, which is the hardest thing to get
from a text prompt alone.

Use the reference for camera behavior only. Build our own performer and our own
generic festival gantry. Do not reproduce the real artist's likeness or the
festival's branded signage.

## Keyframes to generate first

Five stills. Generate these before any video, approve them, then chain the
segments off them.

**KF1, t=0.00, opening stage.**
> Night outdoor music festival, shot from the photo pit on a handheld camera,
> low angle looking slightly up at a stage. A female lead singer stands center
> frame in a mid-shot from the knees up: purple halter top, sheer floral
> wide-leg trousers with a silver chain belt, sunglasses pushed up on her head,
> long dark ponytail, microphone held down at her waist. Three male backup
> dancers behind and to her right in cream short-sleeve shirts and light blue
> jeans, caught mid-move. A black speaker stack at frame left. Grey and pink
> smoke-machine haze behind everyone, lit by pink and white wash lights. Gold
> star-shaped stage props at the frame edges. Silhouetted crowd heads along the
> bottom edge. Photographic, 35mm, shallow depth of field, slight handheld tilt.

**KF2, t=2.60, sky one.**
> Looking almost straight up into a black night sky. Three firework rockets
> climbing on parallel diagonals from lower left to upper right, each a bright
> orange-white head with a long trailing tail of gold sparks and a pale grey
> smoke trail beneath it. The bottom fifth of the frame shows the top edge of a
> festival gantry: LED tubes in red, cyan and white, and a yellow-outlined
> illuminated sign, out of focus. The upper two thirds of the frame is empty
> black sky. Long exposure feel, photographic, vertical.

**KF3, t=6.00, stage return.**
> Night festival stage, handheld mid-shot. A female singer front left, arms
> crossed in front of her chest, smiling, mic in her left hand, purple halter
> top and sheer floral wide-leg trousers. Two dancers close behind her in cream
> shirts, a third at the right third of frame. Enormous white and grey CO2 smoke
> plumes filling the entire background, lit peach and pink from below. One hard
> white beam cutting diagonally through the smoke. Silhouetted crowd heads along
> the bottom edge. Photographic, 35mm, shallow depth of field.

**KF4, t=11.00, the throw.**
> Night festival stage, tighter handheld shot. A female singer mid-frame with
> her right arm thrown fully up above her head holding a microphone, chin
> lifted, purple halter top. One dancer crouched low in front of her, two more
> behind with their arms up. A stage sparkler fountain igniting at the right of
> frame as a vertical jet of gold sparks. Dense peach and charcoal smoke behind
> everyone, lit hard red from the right. A sharply lit gold star prop at the
> left edge. Photographic, high contrast.

**KF5, t=13.60, final embers.**
> Pure black night sky, no ground, no horizon. Three spent firework heads
> glowing deep red-orange, falling on a downward diagonal from upper right to
> lower left, each trailing a bright fizzing tail of sparks and a curl of dark
> red smoke. Scattered loose sparks. Almost the entire frame is black. Long
> exposure feel, photographic, vertical.

## Segment prompts

### Segment 1, covers 0.0 to 4.0
`start_image` KF1, `end_image` KF2.

> Handheld camera holds on the singer and dancers for two seconds, small
> operator sway, the dancers hitting a step in unison, smoke drifting. Then the
> camera whips vertically upward in one violent move over about eight frames
> with heavy directional motion blur, and settles pointing at the night sky just
> as three firework rockets launch and climb away on parallel diagonals, gold
> sparking tails, grey smoke trails behind them. Continuous single take, no cut.

### Segment 2, covers 4.0 to 8.0
`start_image` KF2, `end_image` KF3.

> The three rockets fade out at the top of frame. The camera cranes and tilts
> down in one smooth continuous move, not a whip: the illuminated festival
> gantry passes down through frame, red pyro smoke fills the lens, and the stage
> rises in from the bottom. The move settles on the singer and her dancers as
> white CO2 jets fire on either side of them and the smoke turns from red to
> white. Continuous single take, no cut.

### Segment 3, covers 8.0 to 12.0
`start_image` KF3, `end_image` KF4, then continue past it.

> Handheld on the singer and three dancers, choreography in unison, smoke
> shifting from white through peach to deep red behind them, stage lights
> pulsing. At about three seconds in she throws her microphone arm straight up
> above her head, a sparkler fountain ignites beside her in a vertical jet of
> gold sparks, and on that beat the camera whips vertically upward in one
> violent blurred move and arrives on the black night sky with three rockets
> already climbing. Continuous single take, no cut.

### Segment 4, covers 11.5 to 15.5, trimmed to end at 14.0
`start_image` sky frame from the end of segment 3, `end_image` KF5.

> Locked on the black night sky, small handheld drift. Three firework rockets
> climb on diagonals with gold sparking tails, then arc over at the top of their
> flight, pop from gold to deep red, and fall back on a downward diagonal as red
> ember heads with long fizzing sparkle tails and curls of dark red smoke. The
> sparks thin out and the frame settles to near black. Continuous single take,
> no cut.

## Text overlay

**Add the text in the edit, not in the model.** Generative video does not hold
clean typography: letterforms warp and drift across frames, and a mangled brand
name is worse than no brand name. Generate the sky clean and composite the text
in CapCut, Premiere or After Effects.

If it has to be in-model, the only workable route is to pin an `end_image` that
already has the text rendered flat and cleanly, and even then expect the
letterforms to breathe on the way in. Composite in post.

**Type.** SF Pro Display Bold, which is the site's own stack
(`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue"`).
Helvetica Neue Bold is the fallback. White, tight tracking, a soft dark drop
shadow at low opacity so it survives an ember passing behind it. Sentence case,
matching how the brand is written: **Midsesh**, not MIDSESH.

**Placement.** Centered horizontally, sitting at about 40 percent from the top,
inside the safe area. The rockets run lower left to upper right, so the text
sits in clean black and the sparks streak behind and past it.

**Card one: "Get Midsesh when you kick up"**

- In at **11.15**, the frame the camera arrives in the sky. Not a fade. A hard
  two-frame pop, with a scale from 96 to 100 percent over six frames, so it
  reads as hit by the drop rather than faded on.
- Two lines: "Get Midsesh" on the first, "when you kick up" on the second.
  Second line slightly smaller.
- Holds to **12.85**, drifting up about 2 percent of frame height over the hold
  so it rides with the rockets.

**Card two: "Get Midsesh"**

- At **12.85**, the frame the rockets pop from gold to red and start falling,
  "when you kick up" cuts away and "Get Midsesh" scales up about 8 percent and
  recenters. Cut, not a crossfade. The pop in the sky motivates it.
- Holds from **12.85 to 13.98** over the falling embers, with the same slow
  drift.
- Optional: `midsesh.com` at roughly a quarter of the size, 1.5 line-heights
  below, fading in over the last 0.6 seconds.

If you would rather run one card than two, drop the long line and run
**Get Midsesh** alone from 11.15 to the end.

## The opening caption

The reference carries a Portuguese caption over the first four seconds. Same
position, top third, same rounded bold sans, same white with a light shadow.
Three options, pick one before generating:

1. Keep the structure and translate it: "The sync of the dancers + the artist +
   the fireworks guy + the videomaker".
2. Rewrite it toward us, which sets up the payoff: "When everyone on the job
   actually hits the same cue".
3. Drop it and let the visuals run cold into the first sky beat.

## Assembly

1. Generate KF1 through KF5. Approve the stills before touching video.
2. Generate the four segments, chained, settings above.
3. Cut them together on the timing map. Every join sits inside a whip blur or
   the red smoke wipe. Trim segment 4 so the piece ends at 14.0.
4. Lay the music. The two sky moments must land on a breakdown and on the final
   drop respectively.
5. Composite both text cards.
6. Export 1080x1920, H.264, high bitrate.

## QC before it ships

- [ ] Plays as one take. No join is visible outside a camera move.
- [ ] The first whip up lands on the launch frame, not before or after it.
- [ ] The camera lands back on stage on the 5.0s re-entry hit.
- [ ] The second whip up lands on the final drop at 11.0s.
- [ ] "Get Midsesh when you kick up" pops on at 11.15, no fade.
- [ ] Text is legible at phone size with sound off, and no ember crosses it in a
      way that breaks a letterform.
- [ ] "Midsesh" is spelled correctly in every frame it appears. Step through it.
- [ ] No generated audio left in the mix.
- [ ] The performer is not recognisable as the artist in the reference, and no
      real festival branding appears on the gantry.
