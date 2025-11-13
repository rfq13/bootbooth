package main

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"math"
	"sync"
)

type EffectType string

const (
	EffectNone       EffectType = "none"
	EffectFishEye    EffectType = "fisheye"
	EffectGrayscale  EffectType = "grayscale"
	EffectSepia      EffectType = "sepia"
	EffectVignette   EffectType = "vignette"
	EffectBlur       EffectType = "blur"
	EffectSharpen    EffectType = "sharpen"
	EffectInvert     EffectType = "invert"
	EffectPixelate   EffectType = "pixelate"
)

type EffectParams struct {
	Intensity float64 // 0.0 to 1.0
	Radius    float64 // for fisheye, vignette
	PixelSize int     // for pixelate
}

type ImageEffects struct {
    currentEffect EffectType
    params        EffectParams
    mu            sync.RWMutex
}

func NewImageEffects() *ImageEffects {
	return &ImageEffects{
		currentEffect: EffectNone,
		params: EffectParams{
			Intensity: 0.5,
			Radius:    1.0,
			PixelSize: 10,
		},
	}
}

func (ie *ImageEffects) SetEffect(effect EffectType, params EffectParams) {
	ie.mu.Lock()
	defer ie.mu.Unlock()
	ie.currentEffect = effect
	ie.params = params
}

func (ie *ImageEffects) GetEffect() (EffectType, EffectParams) {
	ie.mu.RLock()
	defer ie.mu.RUnlock()
	return ie.currentEffect, ie.params
}

func (ie *ImageEffects) ApplyEffect(jpegData []byte) ([]byte, error) {
    effect, params := ie.GetEffect()

    // Always decode to allow post transforms (e.g., horizontal flip)
    img, err := jpeg.Decode(bytes.NewReader(jpegData))
    if err != nil {
        return jpegData, err
    }

    // Apply selected effect (if any)
    var processed image.Image
    switch effect {
    case EffectFishEye:
        processed = applyFishEye(img, params)
    case EffectGrayscale:
        processed = applyGrayscale(img)
    case EffectSepia:
        processed = applySepia(img)
    case EffectVignette:
        processed = applyVignette(img, params)
    case EffectBlur:
        processed = applyBlur(img, int(params.Intensity*10))
    case EffectSharpen:
        processed = applySharpen(img)
    case EffectInvert:
        processed = applyInvert(img)
    case EffectPixelate:
        processed = applyPixelate(img, params.PixelSize)
    default:
        processed = img
    }

    // Always apply horizontal flip to correct mirrored output
    processed = applyHorizontalFlip(processed)

    // Encode back to JPEG
    var buf bytes.Buffer
    if err := jpeg.Encode(&buf, processed, &jpeg.Options{Quality: 85}); err != nil {
        return jpegData, err
    }

    return buf.Bytes(), nil
}

/* Revised Fish Eye Effect – simpler, smoother barrel distortion.
   This implementation uses a classic fisheye mapping based on
   normalized radius and an adjustable strength parameter (0‑1).
   It avoids extreme distortion formulas that caused artifacts
   and ensures the entire image area is usable without hard
   black borders. */
func applyFishEye(img image.Image, params EffectParams) image.Image {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	result := image.NewRGBA(bounds)

	centerX := float64(width) / 2
	centerY := float64(height) / 2

	// Maximum radius for the fisheye effect (circle that fits the image)
	maxRadius := math.Min(centerX, centerY)

	// Strength controls how strong the barrel distortion is.
	// 0 = no distortion, 1 = strong fisheye.
	strength := params.Intensity // value in [0,1]

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			// Vector from center to current pixel
			dx := float64(x) - centerX
			dy := float64(y) - centerY
			r := math.Hypot(dx, dy)

			if r > maxRadius {
				// Outside the circular region – copy original pixel
				result.Set(x, y, img.At(x, y))
				continue
			}

			// Normalized radius (0‑1)
			norm := r / maxRadius

			// Apply fisheye mapping with a smoother blend between linear
			// and sinusoidal distortion. This reduces extreme artifacts while
			// still providing a noticeable barrel effect.
			// newR = maxRadius * ((1 - strength) * norm + strength * sin(norm * π/2))
			// strength = 0 → linear (no distortion), strength = 1 → full sin‑based fisheye.
			newR := maxRadius * ((1 - strength) * norm + strength * math.Sin(norm*math.Pi/2))

			// Compute source coordinates using the new radius
			if r == 0 {
				// Center pixel stays the same
				result.Set(x, y, img.At(x, y))
				continue
			}
			scale := newR / r
			srcX := centerX + dx*scale
			srcY := centerY + dy*scale

			// Bilinear interpolation for smooth sampling
			if srcX >= 0 && srcX < float64(width-1) && srcY >= 0 && srcY < float64(height-1) {
				result.Set(x, y, bilinearInterpolateForFishEye(img, srcX, srcY))
			} else {
				// Fallback to nearest neighbor if out of bounds
				ix := int(math.Round(srcX))
				iy := int(math.Round(srcY))
				if ix < 0 {
					ix = 0
				}
				if iy < 0 {
					iy = 0
				}
				if ix >= width {
					ix = width - 1
				}
				if iy >= height {
					iy = height - 1
				}
				result.Set(x, y, img.At(ix, iy))
			}
		}
	}

	// No hard mask – the whole image is rendered.
	return result
}

// Draw circular mask with soft edge for fisheye effect
func drawCircularMaskForFishEye(img *image.RGBA, centerX, centerY, radius float64) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			dx := float64(x) - centerX
			dy := float64(y) - centerY
			distance := math.Sqrt(dx*dx + dy*dy)

			// Soft falloff near the edge but no hard black circle
			softEdge := 80.0
			if distance > radius-softEdge {
				alpha := math.Min(1.0, (radius-distance)/softEdge)
				if alpha < 0 {
					alpha = 0
				}
				c := img.At(x, y)
				r, g, b, _ := c.RGBA()
				img.Set(x, y, color.RGBA{
					uint8(float64(r>>8) * alpha),
					uint8(float64(g>>8) * alpha),
					uint8(float64(b>>8) * alpha),
					255,
				})
			}
		}
	}
}


// Bilinear interpolation for smooth pixel sampling
func bilinearInterpolateForFishEye(img image.Image, x, y float64) color.Color {
	x0 := int(x)
	y0 := int(y)
	x1 := x0 + 1
	y1 := y0 + 1

	fx := x - float64(x0)
	fy := y - float64(y0)

	c00 := img.At(x0, y0)
	c10 := img.At(x1, y0)
	c01 := img.At(x0, y1)
	c11 := img.At(x1, y1)

	r00, g00, b00, a00 := c00.RGBA()
	r10, g10, b10, a10 := c10.RGBA()
	r01, g01, b01, a01 := c01.RGBA()
	r11, g11, b11, a11 := c11.RGBA()

	r := uint8(((float64(r00>>8)*(1-fx) + float64(r10>>8)*fx) * (1-fy) +
		(float64(r01>>8)*(1-fx) + float64(r11>>8)*fx) * fy))
	g := uint8(((float64(g00>>8)*(1-fx) + float64(g10>>8)*fx) * (1-fy) +
		(float64(g01>>8)*(1-fx) + float64(g11>>8)*fx) * fy))
	b := uint8(((float64(b00>>8)*(1-fx) + float64(b10>>8)*fx) * (1-fy) +
		(float64(b01>>8)*(1-fx) + float64(b11>>8)*fx) * fy))
	a := uint8(((float64(a00>>8)*(1-fx) + float64(a10>>8)*fx) * (1-fy) +
		(float64(a01>>8)*(1-fx) + float64(a11>>8)*fx) * fy))

	return color.RGBA{r, g, b, a}
}

// Apply vignetting effect
func applyVignetteForFishEye(c color.Color, strength float64) color.Color {
	r, g, b, a := c.RGBA()
	
	r = uint32(float64(r>>8) * strength)
	g = uint32(float64(g>>8) * strength)
	b = uint32(float64(b>>8) * strength)
	
	if r > 255 { r = 255 }
	if g > 255 { g = 255 }
	if b > 255 { b = 255 }
	
	return color.RGBA{uint8(r), uint8(g), uint8(b), uint8(a >> 8)}
}

// Grayscale Effect
func applyGrayscale(img image.Image) image.Image {
	bounds := img.Bounds()
	result := image.NewRGBA(bounds)

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			oldColor := img.At(x, y)
			r, g, b, a := oldColor.RGBA()
			
			// Convert to grayscale using luminance formula
			gray := uint8((0.299*float64(r) + 0.587*float64(g) + 0.114*float64(b)) / 256)
			
			result.Set(x, y, color.RGBA{gray, gray, gray, uint8(a >> 8)})
		}
	}

	return result
}

// Sepia Effect
func applySepia(img image.Image) image.Image {
	bounds := img.Bounds()
	result := image.NewRGBA(bounds)

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			oldColor := img.At(x, y)
			r, g, b, a := oldColor.RGBA()
			
			fr := float64(r) / 256
			fg := float64(g) / 256
			fb := float64(b) / 256

			newR := uint8(math.Min(255, fr*0.393+fg*0.769+fb*0.189))
			newG := uint8(math.Min(255, fr*0.349+fg*0.686+fb*0.168))
			newB := uint8(math.Min(255, fr*0.272+fg*0.534+fb*0.131))

			result.Set(x, y, color.RGBA{newR, newG, newB, uint8(a >> 8)})
		}
	}

	return result
}

// Vignette Effect - darkens edges
func applyVignette(img image.Image, params EffectParams) image.Image {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	result := image.NewRGBA(bounds)

	centerX := float64(width) / 2
	centerY := float64(height) / 2
	maxDist := math.Sqrt(centerX*centerX + centerY*centerY)

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			dx := float64(x) - centerX
			dy := float64(y) - centerY
			distance := math.Sqrt(dx*dx + dy*dy)
			
			// Calculate vignette factor
			vignette := 1.0 - (distance/maxDist)*params.Intensity
			if vignette < 0 {
				vignette = 0
			}

			oldColor := img.At(x, y)
			r, g, b, a := oldColor.RGBA()

			newR := uint8(float64(r>>8) * vignette)
			newG := uint8(float64(g>>8) * vignette)
			newB := uint8(float64(b>>8) * vignette)

			result.Set(x, y, color.RGBA{newR, newG, newB, uint8(a >> 8)})
		}
	}

	return result
}

// Simple Blur Effect
func applyBlur(img image.Image, radius int) image.Image {
	if radius < 1 {
		radius = 1
	}
	bounds := img.Bounds()
	result := image.NewRGBA(bounds)

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			var sumR, sumG, sumB, sumA, count uint32

			for dy := -radius; dy <= radius; dy++ {
				for dx := -radius; dx <= radius; dx++ {
					nx := x + dx
					ny := y + dy
					if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
						r, g, b, a := img.At(nx, ny).RGBA()
						sumR += r
						sumG += g
						sumB += b
						sumA += a
						count++
					}
				}
			}

			result.Set(x, y, color.RGBA{
				uint8(sumR / count >> 8),
				uint8(sumG / count >> 8),
				uint8(sumB / count >> 8),
				uint8(sumA / count >> 8),
			})
		}
	}

	return result
}

// Sharpen Effect
func applySharpen(img image.Image) image.Image {
	bounds := img.Bounds()
	result := image.NewRGBA(bounds)

	// Sharpening kernel
	kernel := [][]float64{
		{0, -1, 0},
		{-1, 5, -1},
		{0, -1, 0},
	}

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			var sumR, sumG, sumB float64

			for ky := -1; ky <= 1; ky++ {
				for kx := -1; kx <= 1; kx++ {
					nx := x + kx
					ny := y + ky
					if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
						r, g, b, _ := img.At(nx, ny).RGBA()
						k := kernel[ky+1][kx+1]
						sumR += float64(r>>8) * k
						sumG += float64(g>>8) * k
						sumB += float64(b>>8) * k
					}
				}
			}

			_, _, _, a := img.At(x, y).RGBA()
			result.Set(x, y, color.RGBA{
				clamp(sumR),
				clamp(sumG),
				clamp(sumB),
				uint8(a >> 8),
			})
		}
	}

	return result
}

// Invert Effect
func applyInvert(img image.Image) image.Image {
	bounds := img.Bounds()
	result := image.NewRGBA(bounds)

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			oldColor := img.At(x, y)
			r, g, b, a := oldColor.RGBA()

			result.Set(x, y, color.RGBA{
				255 - uint8(r>>8),
				255 - uint8(g>>8),
				255 - uint8(b>>8),
				uint8(a >> 8),
			})
		}
	}

	return result
}

// Pixelate Effect
func applyPixelate(img image.Image, pixelSize int) image.Image {
	if pixelSize < 2 {
		pixelSize = 2
	}
	bounds := img.Bounds()
	result := image.NewRGBA(bounds)

	for y := bounds.Min.Y; y < bounds.Max.Y; y += pixelSize {
		for x := bounds.Min.X; x < bounds.Max.X; x += pixelSize {
			// Get average color of the block
			var sumR, sumG, sumB, sumA, count uint32

			for dy := 0; dy < pixelSize; dy++ {
				for dx := 0; dx < pixelSize; dx++ {
					nx := x + dx
					ny := y + dy
					if nx < bounds.Max.X && ny < bounds.Max.Y {
						r, g, b, a := img.At(nx, ny).RGBA()
						sumR += r
						sumG += g
						sumB += b
						sumA += a
						count++
					}
				}
			}

			avgColor := color.RGBA{
				uint8(sumR / count >> 8),
				uint8(sumG / count >> 8),
				uint8(sumB / count >> 8),
				uint8(sumA / count >> 8),
			}

			// Fill the block with average color
			for dy := 0; dy < pixelSize; dy++ {
				for dx := 0; dx < pixelSize; dx++ {
					nx := x + dx
					ny := y + dy
					if nx < bounds.Max.X && ny < bounds.Max.Y {
						result.Set(nx, ny, avgColor)
					}
				}
			}
		}
	}

	return result
}

func clamp(val float64) uint8 {
    if val < 0 {
        return 0
    }
    if val > 255 {
        return 255
    }
    return uint8(val)
}

// applyHorizontalFlip flips the image horizontally
func applyHorizontalFlip(img image.Image) image.Image {
    b := img.Bounds()
    w := b.Dx()
    h := b.Dy()
    out := image.NewRGBA(b)
    for y := b.Min.Y; y < b.Min.Y+h; y++ {
        for x := b.Min.X; x < b.Min.X+w; x++ {
            srcX := b.Min.X + (w - 1) - (x - b.Min.X)
            out.Set(x, y, img.At(srcX, y))
        }
    }
    return out
}