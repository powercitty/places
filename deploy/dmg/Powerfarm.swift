// Powerfarm — o app do DMG. Dois cliques e a Powerfarm surge neste computador.
// O app não decide nada: roda a coreografia que vem junto (fundar-powerfarm.sh, do mesmo commit)
// e mostra cada passo acendendo. Abrir com --ensaio (ou PF_ENSAIO=1) confere tudo sem mexer em nada.
import AppKit
import SwiftUI

enum Estado { case esperando, rodando, feito, falhou }

struct Passo: Identifiable {
    let id: Int
    let nome: String
    let detalhe: String
    var estado: Estado = .esperando
}

@MainActor
final class Coreografia: ObservableObject {
    static let modelo: [Passo] = [
        Passo(id: 0, nome: "Este computador", detalhe: "É um dos LABs da Powerfarm"),
        Passo(id: 1, nome: "Código", detalhe: "A versão que veio dentro do DMG"),
        Passo(id: 2, nome: "Dependências", detalhe: "Tudo o que o agente precisa para rodar"),
        Passo(id: 3, nome: "Segredos", detalhe: "Guardados no Keychain, nunca mostrados"),
        Passo(id: 4, nome: "Serviço", detalhe: "O agente, o único serviço permitido"),
        Passo(id: 5, nome: "Ligando", detalhe: "Troca a versão sem parar no meio"),
        Passo(id: 6, nome: "Conferindo", detalhe: "O agente responde"),
        Passo(id: 7, nome: "Fundação", detalhe: "O contrato social entra no Registry"),
    ]

    @Published var passos = Coreografia.modelo
    @Published var linhas: [String] = []
    @Published var resumo: String?
    @Published var erro: String?
    @Published var terminou = false
    let ensaio: Bool

    private var processo: Process?
    private var cano: Pipe?
    private var sobra = ""

    init() {
        ensaio = CommandLine.arguments.contains("--ensaio") || ProcessInfo.processInfo.environment["PF_ENSAIO"] == "1"
    }

    func comecar() {
        guard processo == nil, let recursos = Bundle.main.resourceURL else { return }
        passos = Coreografia.modelo
        linhas = []
        resumo = nil
        erro = nil
        terminou = false
        sobra = ""

        let commit = (try? String(contentsOf: recursos.appendingPathComponent("COMMIT"), encoding: .utf8))?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        var argumentos = [
            recursos.appendingPathComponent("fundar-powerfarm.sh").path,
            recursos.appendingPathComponent("places.bundle").path,
            commit,
        ]
        if ensaio { argumentos.append("--ensaio") }

        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/bash")
        p.arguments = argumentos
        p.currentDirectoryURL = FileManager.default.homeDirectoryForCurrentUser
        let c = Pipe()
        p.standardOutput = c
        p.standardError = c
        c.fileHandleForReading.readabilityHandler = { [weak self] h in
            let dados = h.availableData
            guard !dados.isEmpty, let texto = String(data: dados, encoding: .utf8) else { return }
            Task { @MainActor in self?.receber(texto) }
        }
        p.terminationHandler = { [weak self] proc in
            let status = proc.terminationStatus
            Task { @MainActor in self?.acabou(status) }
        }
        do {
            try p.run()
            processo = p
            cano = c
        } catch {
            erro = "não consegui começar: \(error.localizedDescription)"
            terminou = true
        }
    }

    private func receber(_ texto: String) {
        sobra += texto
        while let fim = sobra.firstIndex(of: "\n") {
            processar(String(sobra[..<fim]))
            sobra = String(sobra[sobra.index(after: fim)...])
        }
    }

    private func processar(_ bruta: String) {
        let linha = bruta.trimmingCharacters(in: .whitespaces)
        guard !linha.isEmpty else { return }
        linhas.append(linha)
        if linha.hasPrefix("== ") {
            let resto = linha.dropFirst(3)
            if resto.hasPrefix("fundação") {
                avancar(para: 7)
            } else if let c = resto.first, let n = Int(String(c)), n <= 6 {
                avancar(para: n)
            }
        } else if linha.hasPrefix("✓ Powerfarm") || linha.hasPrefix("✓ ensaio") {
            resumo = String(linha.dropFirst(2))
        } else if linha.hasPrefix("✗") {
            erro = String(linha.dropFirst(1)).trimmingCharacters(in: .whitespaces)
        }
    }

    private func avancar(para i: Int) {
        for k in passos.indices {
            passos[k].estado = k < i ? .feito : (k == i ? .rodando : .esperando)
        }
    }

    private func acabou(_ status: Int32) {
        if let c = cano {
            c.fileHandleForReading.readabilityHandler = nil
            let resto = c.fileHandleForReading.readDataToEndOfFile()
            if let t = String(data: resto, encoding: .utf8) { receber(t) }
        }
        if !sobra.isEmpty { processar(sobra); sobra = "" }
        if status == 0 {
            for k in passos.indices { passos[k].estado = .feito }
            erro = nil
        } else {
            if let k = passos.firstIndex(where: { $0.estado == .rodando }) { passos[k].estado = .falhou }
            if erro == nil { erro = "parou com o código \(status) — veja os detalhes" }
        }
        processo = nil
        cano = nil
        terminou = true
    }
}

struct LinhaDoPasso: View {
    let passo: Passo

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            ZStack {
                switch passo.estado {
                case .esperando:
                    Image(systemName: "circle").foregroundStyle(.tertiary)
                case .rodando:
                    ProgressView().controlSize(.small)
                case .feito:
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                case .falhou:
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.red)
                }
            }
            .font(.system(size: 18))
            .frame(width: 22, height: 22)
            VStack(alignment: .leading, spacing: 1) {
                Text(passo.nome)
                    .font(.system(size: 14, weight: passo.estado == .rodando ? .semibold : .regular))
                    .foregroundStyle(passo.estado == .esperando ? .secondary : .primary)
                Text(passo.detalhe).font(.system(size: 11)).foregroundStyle(.secondary)
            }
            Spacer()
        }
        .animation(.easeInOut(duration: 0.25), value: passo.estado)
    }
}

struct Tela: View {
    @StateObject private var c = Coreografia()
    @State private var verDetalhes = false

    private var titulo: String {
        if !c.terminou { return c.ensaio ? "Ensaio geral" : "Fundando a Powerfarm" }
        if c.erro != nil { return "Parou aqui" }
        return c.ensaio ? "Ensaio perfeito" : "A Powerfarm existe."
    }

    private var subtitulo: String {
        if !c.terminou {
            return c.ensaio ? "Passa por todos os passos só conferindo. Nada é mudado." : "Neste computador, um passo depois do outro."
        }
        if let e = c.erro { return e }
        return c.resumo ?? ""
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            VStack(alignment: .leading, spacing: 6) {
                Text("POWERFARM")
                    .font(.system(size: 11, weight: .semibold))
                    .kerning(2)
                    .foregroundStyle(.secondary)
                Text(titulo)
                    .font(.system(size: 26, weight: .semibold))
                Text(subtitulo)
                    .font(.system(size: 13))
                    .foregroundStyle(c.erro != nil && c.terminou ? .red : .secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .textSelection(.enabled)
            }

            VStack(alignment: .leading, spacing: 11) {
                ForEach(c.passos) { LinhaDoPasso(passo: $0) }
            }

            Spacer(minLength: 0)

            DisclosureGroup("Detalhes", isExpanded: $verDetalhes) {
                ScrollViewReader { rolar in
                    ScrollView {
                        Text(c.linhas.joined(separator: "\n"))
                            .font(.system(size: 10, design: .monospaced))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .textSelection(.enabled)
                            .id("fim")
                    }
                    .frame(height: 140)
                    .onChange(of: c.linhas.count) { rolar.scrollTo("fim", anchor: .bottom) }
                }
            }
            .font(.system(size: 12))

            HStack(spacing: 10) {
                if c.terminou && c.erro == nil && !c.ensaio {
                    Button("Abrir o Places") {
                        if let u = URL(string: "https://places.minilab.work/") { NSWorkspace.shared.open(u) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                }
                if c.terminou && c.erro != nil {
                    Button("Tentar de novo") { c.comecar() }.buttonStyle(.borderedProminent)
                }
                Spacer()
                Button(c.terminou ? "Fechar" : "Fechar (continua sozinho)") { NSApp.terminate(nil) }
            }
            .controlSize(.large)
        }
        .padding(30)
        .frame(width: 460, height: 640)
        .background(Color(nsColor: .windowBackgroundColor))
        .onAppear { c.comecar() }
        .onChange(of: c.terminou) {
            // PF_FOTO=<arquivo.png>: o app fotografa a própria janela no fim (para conferir a tela sem ninguém olhar)
            if c.terminou, let f = ProcessInfo.processInfo.environment["PF_FOTO"] {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { fotografar(f) }
            }
        }
    }
}

@MainActor
func fotografar(_ caminho: String) {
    guard let v = NSApp.windows.first(where: { $0.isVisible })?.contentView,
          let rep = v.bitmapImageRepForCachingDisplay(in: v.bounds) else { return }
    v.cacheDisplay(in: v.bounds, to: rep)
    try? rep.representation(using: .png, properties: [:])?.write(to: URL(fileURLWithPath: caminho))
}

final class Delegado: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationDidFinishLaunching(_ notification: Notification) { NSApp.activate(ignoringOtherApps: true) }
}

@main
struct PowerfarmApp: App {
    @NSApplicationDelegateAdaptor(Delegado.self) private var delegado

    var body: some Scene {
        Window("Powerfarm", id: "powerfarm") { Tela() }
            .windowResizability(.contentSize)
            .windowStyle(.hiddenTitleBar)
    }
}
