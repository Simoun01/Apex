# Hero slide photographs

Drop five photos in this folder and the home-page slider uses them instead of
the 3D rooms. No code change is needed — the slider tries this folder first and
falls back to the rendered room if a file is missing.

## Exact filenames

| File | Slide | Status |
| --- | --- | --- |
| `living-room.jpg` | "Cool comfort, installed right." | **In place** — open-plan living/dining, split unit top right (mirrored so the unit clears the headline) |
| `bedroom.jpg` | "Sleep cool all night, pay less every month." | **In place** — close-up of a wall inverter. Swap it if you want actual bedroom furniture in shot |
| `clean-installs.jpg` | "Neat work you can see." | **In place** — brick wall, slatted credenza, neat unit |
| `lofts.jpg` | "Quiet cooling for work and rest." | **Still needed** — condo, loft or home office with a unit. Falls back to the 3D room until then |
| `floor-standing.jpg` | "Big rooms. Strong, steady cooling." | **Still needed at hero size.** The tower photo supplied was 447 × 447, far too small for a full-bleed hero; it is used on the Our Products card instead (`public/products/mitsubishi-floor.jpg`). Send a version at 2000 px or wider |

The three in place were cropped to 2560 × 1440 and saved at 168–415 KB.

## What makes them work

- **Landscape, at least 2000 × 1200.** They run full-bleed behind the text.
- **Keep the left third quiet.** The headline and buttons sit there over a navy
  scrim; a busy left side makes the copy hard to read.
- **Save as JPG, around 70–80% quality, under ~400 KB each.** These load before
  anything else on the page.
- **Shoot or choose landscape, eye level.** Wide-angle from a corner, the way
  the rendered rooms are framed.

## Where to get them

1. **Your own job photos — best option.** Real Apex installs, no licence
   questions, and they show your actual workmanship. A phone camera in good
   daylight is enough.
2. **Licensed stock.** If you buy from Adobe Stock, Shutterstock or similar,
   keep the licence receipt. Check that the licence covers commercial web use.
3. **Free stock** (Unsplash, Pexels) is possible but thin on Philippine
   interiors with wall-mounted splits, and some results that look free are
   actually paid "Unsplash+" images. Read the licence on each one.

Do not use a photo of a brand's unit in a way that suggests Apex supplied that
exact job unless it is actually yours.

## Using a different filename or path

Set `photo` on the slide in `src/data/homeSlides.ts`:

```ts
photo: '/hero/my-living-room.webp',
```

## Note on the fallback

Until a file exists here, the browser console logs a 404 for each missing
photo and the slide shows its rendered 3D room. That is expected and harmless.
