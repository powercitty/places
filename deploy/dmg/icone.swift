// Desenha o ícone do app (1024×1024 px). Só roda no build do DMG:
//   xcrun swift deploy/dmg/icone.swift <saida.png>
import AppKit

let lado = 1024
let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: lado, pixelsHigh: lado, bitsPerSample: 8, samplesPerPixel: 4,
    hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

// fundo: quadrado arredondado verde, no tamanho da grade de ícones do macOS
let fundo = NSBezierPath(roundedRect: NSRect(x: 100, y: 100, width: 824, height: 824), xRadius: 185, yRadius: 185)
NSGradient(colors: [
    NSColor(srgbRed: 0.04, green: 0.26, blue: 0.18, alpha: 1),
    NSColor(srgbRed: 0.10, green: 0.55, blue: 0.36, alpha: 1),
])!.draw(in: fundo, angle: 90)

// uma semente dentro de um anel: a empresa que nasce do contrato
NSColor.white.setStroke()
let anel = NSBezierPath(ovalIn: NSRect(x: 302, y: 302, width: 420, height: 420))
anel.lineWidth = 36
anel.stroke()
NSColor.white.setFill()
NSBezierPath(ovalIn: NSRect(x: 447, y: 447, width: 130, height: 130)).fill()

NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
