/* ============================================================================
   Real product photos (optional)
   ----------------------------------------------------------------------------
   The showroom carousels show studio renders of the 3D models by default.
   To use real photos instead, put licensed images (for example from the
   brand's official dealer media kit) in `public/products/` and list them here.
   Key format: `${brandId}-${kind}`

     brandId: daikin | trane | carrier | mitsubishi | gree
     kind:    wall | window | floor | cassette | ducted | vrf | packaged

   Example:
     'daikin-wall': '/products/daikin-wall.webp',

   Use a transparent or plain light background, about 900 × 675 px.
   Any product without a photo keeps its rendered image.
   ============================================================================ */

export const PRODUCT_PHOTOS: Partial<Record<string, string>> = {
  // Real photograph supplied by Apex — the floor-standing tower in a living room.
  'mitsubishi-floor': '/products/mitsubishi-floor.jpg',
  // 'daikin-wall': '/products/daikin-wall.webp',
};

export function productPhoto(brandId: string, kind: string): string | undefined {
  return PRODUCT_PHOTOS[`${brandId}-${kind}`];
}
