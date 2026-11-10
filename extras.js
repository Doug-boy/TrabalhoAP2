"use strict";

/* =====================================================================
   EXTRAS DO CADERNO (carregado depois do app.js)
     A. Gráficos em SVG (sem biblioteca)
     B. Tabela de sinais para achar o intervalo
     C. Gráfico da bisseção e animação da secante
     D. Aba "Comparar bisseção × secante"
     E. Exemplos prontos das listas e dos slides
     F. Matriz em grade
     G. Copiar tabela, imprimir, Enter, campos lembrados
   Usa funções do app.js: compilarFuncao, lerFuncao, lerNumero, bissecao, secante, formatar, sub, ...
   ===================================================================== */


/* ---------------------------------------------------------------------
   A. GRÁFICOS EM SVG
   --------------------------------------------------------------------- */

let contadorGraficos = 0;

function passoBonito(bruto) {
  if (!(bruto > 0) || !Number.isFinite(bruto)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(bruto)));
  const f = bruto / e;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e;
}

function marcasBonitas(min, max, alvo = 6) {
  const passo = passoBonito((max - min) / alvo);
  const lista = [];
  for (let v = Math.ceil(min / passo) * passo; v <= max + passo * 1e-9; v += passo) {
    lista.push(Math.abs(v) < passo * 1e-9 ? 0 : v);
    if (lista.length > 50) break;
  }
  return lista;
}

const rotuloEixo = (v) => {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) return v.toExponential(1).replace("e", "e");
  return String(Number(v.toPrecision(4)));
};

const avaliarSeguro = (f, x) => {
  try {
    return f(x);
  } catch (erro) {
    return NaN;
  }
};

// Desenha f(x) em [xmin, xmax]. Extras: faixa [a, b] sombreada, marcas no eixo x, pontos, segmentos de reta.
// Devolve { svg, mapa } (mapa serve para o "passar o mouse" mostrar x e f(x)), ou null se f não tem valores.
function graficoFuncao({ f, xmin, xmax, faixa = null, marcasX = [], pontos = [], segmentos = [], incluirY = [], titulo = "" }) {
  if (!(xmax > xmin) || !Number.isFinite(xmin) || !Number.isFinite(xmax)) return null;
  const largura = 680, altura = 340;
  const m = { esq: 62, dir: 18, cima: 16, baixo: 36 };
  const W = largura - m.esq - m.dir, H = altura - m.cima - m.baixo;
  const N = 700;
  const xs = [], ys = [];
  for (let i = 0; i <= N; i++) {
    const x = xmin + ((xmax - xmin) * i) / N;
    xs.push(x);
    ys.push(avaliarSeguro(f, x));
  }
  const finitos = ys.filter(Number.isFinite).sort((p, q) => p - q);
  if (finitos.length < 2) return null;
  // Faixa vertical: a inteira se a função é "comportada"; sem as pontas se há assíntota (valores explodindo)
  const quantil = (p) => finitos[Math.round(p * (finitos.length - 1))];
  const [cheioMin, cheioMax] = [finitos[0], finitos[finitos.length - 1]];
  const [robMin, robMax] = [quantil(0.05), quantil(0.95)];
  let [ylo, yhi] = cheioMax - cheioMin > 8 * Math.max(robMax - robMin, 1e-300) ? [robMin, robMax] : [cheioMin, cheioMax];
  const extras = incluirY.filter(Number.isFinite);
  ylo = Math.min(ylo, 0, ...extras);
  yhi = Math.max(yhi, 0, ...extras);
  if (yhi - ylo < 1e-300) { ylo -= 1; yhi += 1; }
  const folga = (yhi - ylo) * 0.08;
  ylo -= folga; yhi += folga;

  const X = (x) => m.esq + ((x - xmin) / (xmax - xmin)) * W;
  const Y = (y) => m.cima + ((yhi - y) / (yhi - ylo)) * H;
  const prender = (v) => Math.max(-2 * H, Math.min(3 * H, v));

  // Curva: quebra o traço onde f não existe ou onde dá um salto de assíntota
  let caminho = "", aberto = false, yAnt = NaN;
  for (let i = 0; i <= N; i++) {
    const y = ys[i];
    if (!Number.isFinite(y)) { aberto = false; yAnt = NaN; continue; }
    const salto = Number.isFinite(yAnt) && Math.sign(y) !== Math.sign(yAnt) && Math.abs(Y(y) - Y(yAnt)) > 1.5 * H;
    caminho += `${aberto && !salto ? "L" : "M"}${X(xs[i]).toFixed(1)},${prender(Y(y)).toFixed(1)}`;
    aberto = true; yAnt = y;
  }

  const id = `recorte-${++contadorGraficos}`;
  const marcasHoriz = marcasBonitas(xmin, xmax, 7);
  const marcasVert = marcasBonitas(ylo, yhi, 5);
  const x0 = X(0) >= m.esq && X(0) <= m.esq + W ? X(0) : null;
  let svg = `<svg class="grafico" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="${escapar(titulo || "Gráfico de f(x)")}"
      data-id="${id}" data-xmin="${xmin}" data-xmax="${xmax}" data-ylo="${ylo}" data-yhi="${yhi}">
    <defs><clipPath id="${id}"><rect x="${m.esq}" y="${m.cima}" width="${W}" height="${H}"/></clipPath></defs>`;
  // grade e marcas
  marcasVert.forEach((v) => {
    svg += `<line class="g-grade" x1="${m.esq}" x2="${m.esq + W}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>
      <text class="g-rotulo" x="${m.esq - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${rotuloEixo(v)}</text>`;
  });
  marcasHoriz.forEach((v) => {
    svg += `<text class="g-rotulo" x="${X(v).toFixed(1)}" y="${altura - 12}" text-anchor="middle">${rotuloEixo(v)}</text>`;
  });
  if (faixa) {
    const [fa, fb] = [Math.max(xmin, faixa[0]), Math.min(xmax, faixa[1])];
    if (fb > fa) svg += `<rect class="g-faixa" x="${X(fa).toFixed(1)}" y="${m.cima}" width="${(X(fb) - X(fa)).toFixed(1)}" height="${H}"/>`;
  }
  // eixos (y = 0 sempre está na faixa)
  svg += `<line class="g-eixo" x1="${m.esq}" x2="${m.esq + W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>`;
  if (x0 !== null) svg += `<line class="g-eixo" x1="${x0.toFixed(1)}" x2="${x0.toFixed(1)}" y1="${m.cima}" y2="${m.cima + H}"/>`;
  svg += `<g clip-path="url(#${id})">`;
  svg += `<path class="g-curva" d="${caminho}"/>`;
  segmentos.forEach((s) => {
    svg += `<line class="${s.classe || "g-secante"}" x1="${prender(X(s.x1)).toFixed(1)}" y1="${prender(Y(s.y1)).toFixed(1)}" x2="${prender(X(s.x2)).toFixed(1)}" y2="${prender(Y(s.y2)).toFixed(1)}"/>`;
  });
  const rotulados = []; // posições (em pixels) dos rótulos já escritos, para não encavalar
  marcasX.forEach((mx) => {
    if (mx.x < xmin || mx.x > xmax) return;
    const px = X(mx.x);
    svg += `<line class="g-marca" x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="${(Y(0) - 7).toFixed(1)}" y2="${(Y(0) + 7).toFixed(1)}"/>`;
    if (mx.rotulo) {
      const linha = [20, 34].find((dy) => rotulados.every((r) => r.dy !== dy || Math.abs(r.px - px) >= 26));
      if (linha === undefined) return; // sem espaço: fica só a marca
      rotulados.push({ px, dy: linha });
      svg += `<text class="g-rotulo-marca" x="${px.toFixed(1)}" y="${(Y(0) + linha).toFixed(1)}" text-anchor="middle">${mx.rotulo}</text>`;
    }
  });
  pontos.forEach((p) => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    svg += `<circle class="${p.classe || "g-ponto"}" cx="${prender(X(p.x)).toFixed(1)}" cy="${prender(Y(p.y)).toFixed(1)}" r="5"/>`;
    if (p.rotulo) {
      svg += `<text class="g-rotulo-ponto" x="${(prender(X(p.x)) + 8).toFixed(1)}" y="${(prender(Y(p.y)) - 8).toFixed(1)}">${p.rotulo}</text>`;
    }
  });
  svg += `</g>`;
  // camada do mouse: linha vertical + ponto + texto (preenchidos por ativarMouse)
  svg += `<g class="g-mouse" visibility="hidden"><line class="g-mira" y1="${m.cima}" y2="${m.cima + H}"/><circle class="g-ponto-mouse" r="5"/>
    <rect class="g-caixa-mouse" rx="4" height="22"/><text class="g-texto-mouse"></text></g>
    <rect class="g-captura" x="${m.esq}" y="${m.cima}" width="${W}" height="${H}" fill="transparent"/>`;
  svg += `</svg>`;
  return { svg, mapa: { X, Y, xmin, xmax, ylo, yhi, m, W, H, largura, altura } };
}

// Passar o mouse (ou o dedo) mostra x e f(x) no ponto da curva
function ativarMouse(container, f, mapa) {
  const svg = container.querySelector("svg.grafico");
  if (!svg || !mapa) return;
  const camada = svg.querySelector(".g-mouse");
  const mira = camada.querySelector(".g-mira"), ponto = camada.querySelector(".g-ponto-mouse");
  const caixa = camada.querySelector(".g-caixa-mouse"), texto = camada.querySelector(".g-texto-mouse");
  const mover = (evento) => {
    const r = svg.getBoundingClientRect();
    const toque = evento.touches ? evento.touches[0] : evento;
    const px = ((toque.clientX - r.left) / r.width) * mapa.largura;
    const x = mapa.xmin + ((px - mapa.m.esq) / mapa.W) * (mapa.xmax - mapa.xmin);
    if (x < mapa.xmin || x > mapa.xmax) { camada.setAttribute("visibility", "hidden"); return; }
    const y = avaliarSeguro(f, x);
    const py = Number.isFinite(y) ? Math.max(mapa.m.cima, Math.min(mapa.m.cima + mapa.H, mapa.Y(y))) : mapa.Y(0);
    mira.setAttribute("x1", px); mira.setAttribute("x2", px);
    ponto.setAttribute("cx", px); ponto.setAttribute("cy", py);
    ponto.setAttribute("visibility", Number.isFinite(y) ? "visible" : "hidden");
    texto.textContent = `x = ${rotuloEixo(Number(x.toPrecision(6)))}  ·  f(x) = ${Number.isFinite(y) ? rotuloEixo(Number(y.toPrecision(6))) : "não existe"}`;
    const larguraTexto = texto.getComputedTextLength ? texto.getComputedTextLength() : 180;
    const tx = px + 12 + larguraTexto + 12 > mapa.largura ? px - larguraTexto - 24 : px + 12;
    texto.setAttribute("x", tx + 6); texto.setAttribute("y", mapa.m.cima + 15);
    caixa.setAttribute("x", tx); caixa.setAttribute("y", mapa.m.cima);
    caixa.setAttribute("width", larguraTexto + 12);
    camada.setAttribute("visibility", "visible");
  };
  const esconder = () => camada.setAttribute("visibility", "hidden");
  const captura = svg.querySelector(".g-captura");
  captura.addEventListener("mousemove", mover);
  captura.addEventListener("touchmove", mover, { passive: true });
  captura.addEventListener("mouseleave", esconder);
  captura.addEventListener("touchend", esconder);
}

function colocarGrafico(container, resultado, f, legenda) {
  if (!resultado) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `<figure class="figura">${resultado.svg}<figcaption>${legenda}</figcaption></figure>`;
  ativarMouse(container, f, resultado.mapa);
}


/* ---------------------------------------------------------------------
   B. TABELA DE SINAIS: procura onde f troca de sinal num intervalo grande
   --------------------------------------------------------------------- */

const LIMITE_LINHAS_SINAIS = 2000;

function montarTabelaSinais(metodo) {
  const p = metodo === "bissecao" ? "bis" : "sec";
  const saida = pegar(`${p}-sinais-saida`);
  avisosLeitura = [];
  try {
    const f = lerFuncao(`${p}-funcao`);
    const de = lerNumero(`${p}-sinais-de`, "De");
    const ate = lerNumero(`${p}-sinais-ate`, "Até");
    const passo = lerNumero(`${p}-sinais-passo`, "Passo");
    if (!(ate > de)) throw new ErroDoMetodo("“Até” precisa ser maior que “De”.", { codigo: "numero" });
    if (!(passo > 0)) throw new ErroDoMetodo("O passo precisa ser maior que zero.", { codigo: "numero" });
    const quantidade = Math.floor((ate - de) / passo + 1e-9) + 1;
    if (quantidade > LIMITE_LINHAS_SINAIS) {
      throw new ErroDoMetodo(`Com esse passo seriam ${quantidade} linhas (o limite é ${LIMITE_LINHAS_SINAIS}). Aumente o passo ou diminua o intervalo.`, { codigo: "numero" });
    }
    const xs = Array.from({ length: quantidade }, (_, i) => Number((de + i * passo).toPrecision(12)));
    const fs = xs.map((x) => avaliarSeguro(f, x));
    const simbolo = (v) => (!Number.isFinite(v) ? "não existe" : v > 0 ? "+" : v < 0 ? "−" : "0");
    const usar = (a, b) => (metodo === "bissecao"
      ? botaoSugestao(`usar [${rotuloEixo(a)}; ${rotuloEixo(b)}]`, { "bis-a": paraCampo(a), "bis-b": paraCampo(b) }, "botao-bissecao")
      : botaoSugestao(`usar x₀ = ${rotuloEixo(a)}, x₁ = ${rotuloEixo(b)}`, { "sec-x0": paraCampo(a), "sec-x1": paraCampo(b) }, "botao-secante"));

    const linhas = [];
    const achados = [];
    for (let i = 0; i < quantidade; i++) {
      const destaque = fs[i] === 0 ? " class=\"linha-raiz\"" : "";
      linhas.push(`<tr${destaque}><td>${rotuloEixo(xs[i])}</td><td>${Number.isFinite(fs[i]) ? formatar(fs[i], 6) : "não existe"}</td><td class="sinal">${simbolo(fs[i])}</td></tr>`);
      if (fs[i] === 0) {
        const esq = avaliarSeguro(f, xs[i] - passo / 2), dir = avaliarSeguro(f, xs[i] + passo / 2);
        const troca = Number.isFinite(esq) && Number.isFinite(dir) && Math.sign(esq) * Math.sign(dir) < 0;
        const texto = troca
          ? `f(${rotuloEixo(xs[i])}) = 0: raiz exata. ${usar(xs[i] - passo / 2, xs[i] + passo / 2)}`
          : `f(${rotuloEixo(xs[i])}) = 0, mas f não troca de sinal ali: raiz de multiplicidade par (a bisseção não enxerga).`;
        linhas.push(`<tr class="linha-troca"><td colspan="3">↑ ${texto}</td></tr>`);
        achados.push({ tipo: troca ? "raiz" : "toque", a: xs[i] - passo / 2, b: xs[i] + passo / 2, exata: xs[i] });
        continue;
      }
      if (i + 1 < quantidade && Number.isFinite(fs[i]) && Number.isFinite(fs[i + 1]) && fs[i + 1] !== 0 && Math.sign(fs[i]) !== Math.sign(fs[i + 1])) {
        const raiz = trocaEhRaiz(f, xs[i], xs[i + 1], fs[i], fs[i + 1]);
        achados.push({ tipo: raiz ? "raiz" : "assintota", a: xs[i], b: xs[i + 1] });
        linhas.push(`<tr class="linha-troca"><td colspan="3">↓ f troca de sinal entre ${rotuloEixo(xs[i])} e ${rotuloEixo(xs[i + 1])}: ${raiz
          ? `há raiz em [${rotuloEixo(xs[i])}; ${rotuloEixo(xs[i + 1])}]. ${usar(xs[i], xs[i + 1])}`
          : "é uma assíntota (|f| explode), não uma raiz."}</td></tr>`);
      } else if (i + 1 < quantidade && Number.isFinite(fs[i]) !== Number.isFinite(fs[i + 1])) {
        linhas.push(`<tr class="linha-troca"><td colspan="3">↓ f deixa de existir (ou volta a existir) entre ${rotuloEixo(xs[i])} e ${rotuloEixo(xs[i + 1])}: limite do domínio.</td></tr>`);
      }
    }
    const raizes = achados.filter((q) => q.tipo === "raiz");
    const resumo = raizes.length
      ? `<p class="resultado">f troca de sinal (com raiz) em ${raizes.length} intervalo(s): ${raizes.map((q) => usar(q.a, q.b)).join(" ")}</p>`
      : `<p class="erro">Nenhuma troca de sinal com raiz entre ${rotuloEixo(de)} e ${rotuloEixo(ate)} com passo ${rotuloEixo(passo)}.
          ${achados.some((q) => q.tipo === "toque") ? "Há raiz que só encosta no eixo (multiplicidade par)." : "Tente outro intervalo ou um passo menor."}</p>`;
    const dica = `<p class="aviso">Dica: com passo grande, duas raízes muito próximas podem “se cancelar” (o sinal volta ao mesmo).
      Se a função oscila, diminua o passo.</p>`;
    const grafico = graficoFuncao({
      f, xmin: de, xmax: ate,
      marcasX: raizes.map((q) => ({ x: q.exata !== undefined ? q.exata : (q.a + q.b) / 2 })),
      titulo: "Gráfico de f(x) na região da tabela de sinais",
    });
    saida.innerHTML = blocoAvisosLeitura() + resumo + dica
      + (grafico ? `<figure class="figura">${grafico.svg}<figcaption>f(x) de ${rotuloEixo(de)} a ${rotuloEixo(ate)}. As marcas no eixo x mostram onde há raiz. Passe o mouse para ler os valores.</figcaption></figure>` : "")
      + `<details class="contas"><summary>Tabela de sinais (${quantidade} linhas)</summary><div class="rolagem"><table class="tabela-sinais"><thead><tr><th>x</th><th>f(x)</th><th>sinal</th></tr></thead><tbody>${linhas.join("")}</tbody></table></div></details>`;
    if (grafico) ativarMouse(saida, f, grafico.mapa);
  } catch (erro) {
    mostrarErro(saida, erro, blocoAvisosLeitura() + quadroSeguro(() => painelErroDeEntrada(erro)));
  }
}


/* ---------------------------------------------------------------------
   C. GRÁFICO DA BISSEÇÃO E ANIMAÇÃO DA SECANTE
   (o app.js avisa com o evento "resultado" sempre que um cálculo termina)
   --------------------------------------------------------------------- */

function graficoBissecao(detalhe) {
  const area = pegar("bis-grafico");
  const { r, ctx } = detalhe;
  if (!ctx || !ctx.f || !Number.isFinite(ctx.a) || !Number.isFinite(ctx.b) || ctx.a === ctx.b) {
    area.innerHTML = "";
    return;
  }
  const largura = ctx.b - ctx.a;
  const xmin = ctx.a - 0.15 * largura, xmax = ctx.b + 0.15 * largura;
  const passos = r ? r.passos : [];
  const marcasX = passos.slice(0, 40).map((p, i) => ({ x: p.x, rotulo: i < 6 ? `x${sub(p.iteracao)}` : "" }));
  const pontos = r && r.sucesso ? [{ x: r.raiz, y: r.fx, classe: "g-ponto-raiz", rotulo: `raiz ≈ ${rotuloEixo(Number(r.raiz.toPrecision(6)))}` }] : [];
  const grafico = graficoFuncao({ f: ctx.f, xmin, xmax, faixa: [ctx.a, ctx.b], marcasX, pontos, titulo: "Gráfico de f(x) na bisseção" });
  const legenda = r
    ? `f(x) perto de [a, b] (faixa sombreada). As marcas no eixo são os pontos médios x₁, x₂, …: repare como eles se espremem em volta da raiz. Passe o mouse para ler os valores.`
    : `f(x) perto de [a, b] (faixa sombreada): veja no gráfico por que o método não rodou. Passe o mouse para ler os valores.`;
  colocarGrafico(area, grafico, ctx.f, legenda);
}

// Animação da secante: em cada iteração, a reta pelos dois últimos pontos corta o eixo x no próximo ponto
function graficoSecante(detalhe) {
  const area = pegar("sec-grafico");
  const { r, ctx } = detalhe;
  if (!ctx || !ctx.f || !Number.isFinite(ctx.x0) || !Number.isFinite(ctx.x1)) {
    area.innerHTML = "";
    return;
  }
  const passos = r ? r.passos.filter((p) => Number.isFinite(p.xNovo) && Number.isFinite(p.fNovo)) : [];
  if (!passos.length) {
    const largura = Math.max(Math.abs(ctx.x1 - ctx.x0), 1);
    const centro = (ctx.x0 + ctx.x1) / 2;
    const grafico = graficoFuncao({
      f: ctx.f, xmin: centro - 2 * largura, xmax: centro + 2 * largura,
      pontos: [{ x: ctx.x0, y: avaliarSeguro(ctx.f, ctx.x0), classe: "g-ponto-secante", rotulo: "x₀" }, { x: ctx.x1, y: avaliarSeguro(ctx.f, ctx.x1), classe: "g-ponto-secante", rotulo: "x₁" }],
      titulo: "Gráfico de f(x) perto dos chutes",
    });
    colocarGrafico(area, grafico, ctx.f, "f(x) perto dos chutes x₀ e x₁. Passe o mouse para ler os valores.");
    return;
  }
  area.innerHTML = `
    <div class="animacao">
      <div class="animacao-controles">
        <button type="button" class="botao secundario pequeno" data-acao="anterior">◀ Anterior</button>
        <span class="animacao-passo" aria-live="polite"></span>
        <button type="button" class="botao secundario pequeno" data-acao="proxima">Próxima ▶</button>
        <button type="button" class="botao secundario pequeno" data-acao="animar">▶ Animar</button>
        <label class="animacao-zoom"><input type="checkbox" data-acao="zoom" checked> aproximar a cada passo</label>
      </div>
      <div class="animacao-figura"></div>
    </div>`;
  // Tudo preso à caixa da animação (recriada a cada cálculo): ouvintes antigos somem junto com ela
  const caixa = area.querySelector(".animacao");
  const figura = caixa.querySelector(".animacao-figura");
  const rotuloPasso = caixa.querySelector(".animacao-passo");
  const caixaZoom = caixa.querySelector("[data-acao='zoom']");
  const { fmt } = criarFormatos(ctx.casas !== undefined ? ctx.casas : 6);
  // Visão geral: todos os pontos que não fugiram demais
  const todos = [ctx.x0, ctx.x1, ...passos.map((p) => p.xNovo)];
  const base = Math.max(Math.abs(ctx.x1 - ctx.x0), 1e-9);
  const proximos = todos.filter((x) => Math.abs(x - (ctx.x0 + ctx.x1) / 2) < 50 * base);
  const geral = [Math.min(...proximos), Math.max(...proximos)];
  let atual = 0, timer = null;

  const desenhar = () => {
    const p = passos[atual];
    const i = p.iteracao;
    let [xmin, xmax] = geral;
    if (caixaZoom.checked) {
      const lo = Math.min(p.xAnterior, p.xAtual, p.xNovo), hi = Math.max(p.xAnterior, p.xAtual, p.xNovo);
      const abertura = Math.max(hi - lo, 1e-9 * Math.max(1, Math.abs(hi)));
      [xmin, xmax] = [lo - 0.4 * abertura, hi + 0.4 * abertura];
    } else {
      const abertura = Math.max(geral[1] - geral[0], 1e-9);
      [xmin, xmax] = [geral[0] - 0.15 * abertura, geral[1] + 0.15 * abertura];
    }
    // reta secante, prolongada para cruzar toda a janela
    const inclinacao = (p.fAtual - p.fAnterior) / (p.xAtual - p.xAnterior);
    const reta = (x) => p.fAtual + inclinacao * (x - p.xAtual);
    const grafico = graficoFuncao({
      f: ctx.f, xmin, xmax,
      incluirY: [p.fAnterior, p.fAtual],
      segmentos: [
        { x1: xmin, y1: reta(xmin), x2: xmax, y2: reta(xmax), classe: "g-secante" },
        { x1: p.xNovo, y1: 0, x2: p.xNovo, y2: p.fNovo, classe: "g-tracejada" },
      ],
      pontos: [
        { x: p.xAnterior, y: p.fAnterior, classe: "g-ponto-secante", rotulo: `x${sub(i - 1)}` },
        { x: p.xAtual, y: p.fAtual, classe: "g-ponto-secante", rotulo: `x${sub(i)}` },
        { x: p.xNovo, y: 0, classe: "g-ponto-novo", rotulo: `x${sub(i + 1)}` },
        { x: p.xNovo, y: p.fNovo, classe: "g-ponto" },
      ],
      titulo: `Secante, iteração ${i}`,
    });
    const legenda = `<strong>Iteração i = ${i}:</strong> a reta (laranja) passa por (x${sub(i - 1)}; f(x${sub(i - 1)})) = (${fmt(p.xAnterior)}; ${fmt(p.fAnterior)})
      e (x${sub(i)}; f(x${sub(i)})) = (${fmt(p.xAtual)}; ${fmt(p.fAtual)}) e corta o eixo x em <strong>x${sub(i + 1)} = ${fmt(p.xNovo)}</strong>.
      Depois calculamos f(x${sub(i + 1)}) = ${fmt(p.fNovo)} (tracejado). Passe o mouse para ler os valores.`;
    colocarGrafico(figura, grafico, ctx.f, legenda);
    rotuloPasso.textContent = `Iteração ${i} de ${passos.length}`;
    caixa.querySelector("[data-acao='anterior']").disabled = atual === 0;
    caixa.querySelector("[data-acao='proxima']").disabled = atual === passos.length - 1;
  };
  const parar = () => {
    if (timer) clearInterval(timer);
    timer = null;
    caixa.querySelector("[data-acao='animar']").textContent = "▶ Animar";
  };
  caixa.addEventListener("click", (evento) => {
    const acao = evento.target.closest("[data-acao]");
    if (!acao) return;
    if (acao.dataset.acao === "anterior" && atual > 0) { parar(); atual--; desenhar(); }
    if (acao.dataset.acao === "proxima" && atual < passos.length - 1) { parar(); atual++; desenhar(); }
    if (acao.dataset.acao === "animar") {
      if (timer) { parar(); return; }
      if (atual === passos.length - 1) atual = -1;
      acao.textContent = "❚❚ Pausar";
      const avancar = () => {
        if (!document.body.contains(caixa) || atual >= passos.length - 1) { parar(); return; }
        atual++;
        desenhar();
      };
      avancar();
      timer = setInterval(avancar, 1400);
    }
  });
  caixaZoom.addEventListener("change", desenhar);
  desenhar();
}

pegar("saida-bissecao").addEventListener("resultado", (evento) => {
  try { graficoBissecao(evento.detail); } catch (erro) { console.warn("gráfico da bisseção:", erro); pegar("bis-grafico").innerHTML = ""; }
});
pegar("saida-secante").addEventListener("resultado", (evento) => {
  try { graficoSecante(evento.detail); } catch (erro) { console.warn("gráfico da secante:", erro); pegar("sec-grafico").innerHTML = ""; }
});
pegar("bis-sinais-botao").addEventListener("click", () => montarTabelaSinais("bissecao"));
pegar("sec-sinais-botao").addEventListener("click", () => montarTabelaSinais("secante"));

/* ---------------------------------------------------------------------
   D. COMPARAR BISSEÇÃO × SECANTE (gráfico do erro em escala log)
   --------------------------------------------------------------------- */

const SUPERSCRITOS = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const potencia10 = (e) => `10${String(e).split("").map((c) => SUPERSCRITOS[c] || c).join("")}`;

// series: [{ nome, classe, pontos: [{k, erro}] }] → gráfico de linhas com eixo y em log10
function graficoErros(series) {
  const largura = 680, altura = 340;
  const m = { esq: 62, dir: 110, cima: 16, baixo: 40 };
  const W = largura - m.esq - m.dir, H = altura - m.cima - m.baixo;
  const todos = series.flatMap((s) => s.pontos);
  if (!todos.length) return "";
  const kMax = Math.max(...todos.map((p) => p.k));
  const logs = todos.map((p) => Math.log10(p.erro));
  const eMin = Math.floor(Math.min(...logs)), eMax = Math.ceil(Math.max(...logs));
  const [lo, hi] = eMin === eMax ? [eMin - 1, eMax + 1] : [eMin, eMax];
  const X = (k) => m.esq + (kMax <= 1 ? W / 2 : ((k - 1) / (kMax - 1)) * W);
  const Y = (erro) => m.cima + ((hi - Math.log10(erro)) / (hi - lo)) * H;
  let svg = `<svg class="grafico" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Erro por iteração, escala log">`;
  const passoE = Math.max(1, Math.ceil((hi - lo) / 6));
  for (let e = hi; e >= lo; e -= passoE) {
    const y = m.cima + ((hi - e) / (hi - lo)) * H;
    svg += `<line class="g-grade" x1="${m.esq}" x2="${m.esq + W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>
      <text class="g-rotulo" x="${m.esq - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${potencia10(e)}</text>`;
  }
  marcasBonitas(1, Math.max(kMax, 2), 8).filter((k) => Number.isInteger(k) && k >= 1 && k <= kMax).forEach((k) => {
    svg += `<text class="g-rotulo" x="${X(k).toFixed(1)}" y="${altura - 18}" text-anchor="middle">${k}</text>`;
  });
  svg += `<text class="g-rotulo" x="${m.esq + W / 2}" y="${altura - 2}" text-anchor="middle">iteração k</text>`;
  svg += `<line class="g-eixo" x1="${m.esq}" x2="${m.esq + W}" y1="${m.cima + H}" y2="${m.cima + H}"/>`;
  series.forEach((s) => {
    if (!s.pontos.length) return;
    const d = s.pontos.map((p, i) => `${i ? "L" : "M"}${X(p.k).toFixed(1)},${Y(p.erro).toFixed(1)}`).join("");
    svg += `<path class="g-serie ${s.classe}" d="${d}"/>`;
    s.pontos.forEach((p) => {
      svg += `<circle class="g-marcador ${s.classe}" cx="${X(p.k).toFixed(1)}" cy="${Y(p.erro).toFixed(1)}" r="4"/>
        <circle class="g-alvo" cx="${X(p.k).toFixed(1)}" cy="${Y(p.erro).toFixed(1)}" r="10"><title>${s.nome}, iteração ${p.k}: erro = ${p.erro.toExponential(3)}</title></circle>`;
    });
    // rótulo direto no fim da linha (além da legenda)
    const ultimo = s.pontos[s.pontos.length - 1];
    svg += `<text class="g-rotulo-serie" x="${(X(ultimo.k) + 10).toFixed(1)}" y="${(Y(ultimo.erro) + 4).toFixed(1)}">${s.nome}</text>`;
  });
  svg += `</svg>`;
  const legenda = `<div class="legenda">${series.map((s) => `<span class="legenda-item"><span class="legenda-cor ${s.classe}"></span>${s.nome}</span>`).join("")}</div>`;
  return legenda + svg;
}

function executarComparacao() {
  const saida = pegar("saida-comparar");
  avisosLeitura = [];
  try {
    const f = lerFuncao("cmp-funcao");
    const a = lerNumero("cmp-a", "a (e x₀)");
    const b = lerNumero("cmp-b", "b (e x₁)");
    const tolerancia = lerTolerancia("cmp-tolerancia");
    const maxIteracoes = lerMaxIteracoes("cmp-maxiter");
    const tipoErro = pegar("cmp-tipoerro").value;

    const rodar = (metodo) => {
      try {
        const r = metodo === "bissecao"
          ? bissecao(f, a, b, tolerancia, maxIteracoes, tipoErro, "erro")
          : secante(f, a, b, tolerancia, maxIteracoes, tipoErro, "erro");
        return { r };
      } catch (erro) {
        return { erro };
      }
    };
    const bis = rodar("bissecao"), sec = rodar("secante");
    const linha = (nome, res) => {
      if (res.erro) return `<tr><td>${nome}</td><td colspan="5" class="texto-erro">Não rodou: ${escapar(res.erro.message)}</td></tr>`;
      const r = res.r;
      const ordem = r.sucesso ? estimarOrdem(r.passos) : null;
      return `<tr><td>${nome}</td><td>${r.passos.length}</td><td>${formatar(r.raiz, 8)}</td><td>${formatar(Math.abs(r.fx), 3)}</td>
        <td>${ordem === null ? "—" : ordem.toFixed(2)}</td><td>${r.sucesso ? "convergiu" : escapar(r.motivo || "não convergiu")}</td></tr>`;
    };
    const tabela = `<div class="rolagem"><table><thead><tr><th>Método</th><th>Iterações</th><th>Raiz</th><th>|f(raiz)|</th><th>Ordem estimada</th><th>Resultado</th></tr></thead>
      <tbody>${linha("Bisseção", bis)}${linha("Secante", sec)}</tbody></table></div>`;

    const pontos = (res, campoX) => (res.r ? res.r.passos.filter((p) => p.erroAbs !== null && p.erroAbs > 0 && Number.isFinite(p.erroAbs))
      .map((p) => ({ k: p.iteracao, erro: p.erroAbs, x: p[campoX] })) : []);
    const series = [
      { nome: "Bisseção", classe: "serie-1", pontos: pontos(bis, "x") },
      { nome: "Secante", classe: "serie-2", pontos: pontos(sec, "xNovo") },
    ];
    const grafico = graficoErros(series);

    // Frase que explica o que o gráfico mostra
    let conclusao = "";
    if (bis.r && sec.r && bis.r.sucesso && sec.r.sucesso) {
      const ordemSec = estimarOrdem(sec.r.passos);
      const maisRapido = sec.r.passos.length < bis.r.passos.length ? "A secante" : sec.r.passos.length > bis.r.passos.length ? "A bisseção" : "Os dois";
      conclusao = `<p class="resultado">${maisRapido === "Os dois" ? "Os dois métodos precisaram" : `${maisRapido} precisou de menos iterações:`} bisseção ${bis.r.passos.length}, secante ${sec.r.passos.length}.</p>
        <p class="aviso">No gráfico (escala log), a bisseção desce em linha reta: o erro cai sempre pela metade, convergência linear (ordem 1).
        A secante desce cada vez mais rápido${ordemSec ? ` (ordem estimada ≈ ${ordemSec.toFixed(2)}; a teoria diz 1,618)` : ""}: convergência superlinear.
        Em troca, só a bisseção tem convergência garantida.</p>`;
    } else if (sec.r && !sec.r.sucesso) {
      conclusao = `<p class="aviso">A secante não convergiu aqui (${escapar(sec.r.motivo)}). É o preço da velocidade: ela não tem garantia, e a bisseção tem.</p>`;
    } else if (bis.erro) {
      conclusao = `<p class="aviso">A bisseção não rodou (${escapar(bis.erro.message)}). A secante não exige troca de sinal, mas também não tem garantia.</p>`;
    }
    const kMax = Math.max(0, ...series.flatMap((s) => s.pontos.map((p) => p.k)));
    const porK = (s, k) => {
      const p = s.pontos.find((q) => q.k === k);
      return p ? p.erro.toExponential(3) : "—";
    };
    const dados = kMax
      ? `<details class="contas"><summary>Ver os dados do gráfico (tabela)</summary><div class="rolagem"><table><thead><tr><th>k</th><th>Erro absoluto da bisseção</th><th>Erro absoluto da secante</th></tr></thead><tbody>
        ${Array.from({ length: kMax }, (_, i) => i + 1).map((k) => `<tr><td>${k}</td><td>${porK(series[0], k)}</td><td>${porK(series[1], k)}</td></tr>`).join("")}</tbody></table></div></details>`
      : "";
    saida.innerHTML = blocoAvisosLeitura() + conclusao + tabela
      + (grafico ? `<figure class="figura"><figcaption class="titulo-figura">Erro absoluto |xₖ − xₖ₋₁| em cada iteração (escala log)</figcaption>${grafico}
          <figcaption>Cada potência de 10 a menos no eixo vertical é, mais ou menos, um algarismo correto a mais. Passe o mouse nos pontos para ver o valor.</figcaption></figure>` : "")
      + dados;
  } catch (erro) {
    mostrarErro(saida, erro, blocoAvisosLeitura() + quadroSeguro(() => painelErroDeEntrada(erro)));
  }
}

pegar("botao-comparar").addEventListener("click", executarComparacao);

/* ---------------------------------------------------------------------
   E. EXEMPLOS PRONTOS (Lista 4, Lista 6 e slides do Capítulo 3)
   Cada exemplo preenche os campos, mostra o enunciado e roda.
   --------------------------------------------------------------------- */

const HILBERT = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i + j === 0 ? "1" : `1/${i + j + 1}`)).join(" ")).join("\n");

const EXEMPLOS = {
  bissecao: [
    { grupo: "Lista 4", nome: "Q1: eˣ − 3x em [1, 2]", enunciado: "Lista 4, Q1: zero de f(x) = eˣ − 3x em [1, 2], com N = 20 e ε = 10⁻⁵. Após cada iteração, erros absoluto e relativo.",
      campos: { "bis-funcao": "e^x - 3x", "bis-a": "1", "bis-b": "2", "bis-tolerancia": "10^-5", "bis-maxiter": "20", "bis-tipoerro": "absoluto", "bis-criterio": "erro" } },
    { grupo: "Lista 4", nome: "Q2a: x/2 − tg(x) (menor raiz positiva)", enunciado: "Lista 4, Q2a: menor raiz positiva de x/2 − tg(x) = 0, com ε = 10⁻⁴ e N = 20. O intervalo [4; 4,5] sai da tabela de sinais (de 0 a 5, passo 0,5): entre 0 e π não há raiz positiva, e em π/2 há uma assíntota.",
      campos: { "bis-funcao": "x/2 - tg(x)", "bis-a": "4", "bis-b": "4.5", "bis-tolerancia": "10^-4", "bis-maxiter": "20", "bis-tipoerro": "absoluto", "bis-criterio": "erro", "bis-sinais-de": "0", "bis-sinais-ate": "5", "bis-sinais-passo": "0.5" } },
    { grupo: "Lista 4", nome: "Q2b: 2cos(x) = eˣ/2", enunciado: "Lista 4, Q2b: menor raiz positiva de 2cos(x) = eˣ/2, com ε = 10⁻⁴ e N = 20. Em [0, 1]: f(0) = 1,5 > 0 e f(1) ≈ −0,28 < 0.",
      campos: { "bis-funcao": "2cos(x) = e^x/2", "bis-a": "0", "bis-b": "1", "bis-tolerancia": "10^-4", "bis-maxiter": "20", "bis-tipoerro": "absoluto", "bis-criterio": "erro" } },
    { grupo: "Lista 4", nome: "Q2c: x⁵ − 6 = 0", enunciado: "Lista 4, Q2c: menor raiz positiva de x⁵ − 6 = 0, com ε = 10⁻⁴ e N = 20. Em [1, 2]: f(1) = −5 e f(2) = 26.",
      campos: { "bis-funcao": "x^5 - 6", "bis-a": "1", "bis-b": "2", "bis-tolerancia": "10^-4", "bis-maxiter": "20", "bis-tipoerro": "absoluto", "bis-criterio": "erro" } },
    { grupo: "Lista 4", nome: "Q3: x log(x) − 1 em [2, 3]", enunciado: "Lista 4, Q3: zero de f(x) = x·log(x) − 1 em [2, 3] (log na base 10), com N = 15 e ε = 5×10⁻⁴.",
      campos: { "bis-funcao": "x log(x) - 1", "bis-a": "2", "bis-b": "3", "bis-tolerancia": "5x10^-4", "bis-maxiter": "15", "bis-tipoerro": "absoluto", "bis-criterio": "erro" } },
    { grupo: "Lista 4", nome: "Q4: x³ − 9x + 3 em [0, 1]", enunciado: "Lista 4, Q4: zero de f(x) = x³ − 9x + 3 em [0, 1], com N = 15 e ε = 10⁻³.",
      campos: { "bis-funcao": "x^3 - 9x + 3", "bis-a": "0", "bis-b": "1", "bis-tolerancia": "10^-3", "bis-maxiter": "15", "bis-tipoerro": "absoluto", "bis-criterio": "erro" } },
    { grupo: "Slides (Cap. 3)", nome: "Exemplo 05: x³ − 9x + 3, ε = 10⁻², k = 10", enunciado: "Slides, Exemplo 05: f(x) = x³ − 9x + 3 em I = [0, 1], ε = 10⁻² e k = 10. Na tabela do slide o critério é o erro relativo |xᵢ₊₁ − xᵢ|/|xᵢ₊₁| (sem multiplicar por 100): para na 9ª iteração com 0,00578 < 0,01.",
      campos: { "bis-funcao": "x^3 - 9x + 3", "bis-a": "0", "bis-b": "1", "bis-tolerancia": "10^-2", "bis-maxiter": "10", "bis-tipoerro": "relativo", "bis-criterio": "erro" } },
    { grupo: "Outros critérios", nome: "(b − a)/2 < ε: x³ + 4x² − 10 em [1, 2]", enunciado: "Critério do Burden e do Ruggiero: parar quando (b − a)/2 < ε. f(x) = x³ + 4x² − 10 em [1, 2], ε = 10⁻⁴.",
      campos: { "bis-funcao": "x^3 + 4x^2 - 10", "bis-a": "1", "bis-b": "2", "bis-tolerancia": "10^-4", "bis-maxiter": "50", "bis-tipoerro": "absoluto", "bis-criterio": "cota" } },
    { grupo: "Outros critérios", nome: "Fazer exatamente 5 iterações", enunciado: "Quando a questão pede “faça 5 iterações” (sem ε): x³ − 2x − 5 em [2, 3].",
      campos: { "bis-funcao": "x^3 - 2x - 5", "bis-a": "2", "bis-b": "3", "bis-maxiter": "5", "bis-tipoerro": "absoluto", "bis-criterio": "fixo" } },
    { grupo: "Por que não roda?", nome: "x² em [−1, 1] (Bolzano não se aplica)", enunciado: "f(a) e f(b) têm o mesmo sinal: o Teorema de Bolzano não garante raiz, apesar de x = 0 ser raiz (raiz dupla).",
      campos: { "bis-funcao": "x^2", "bis-a": "-1", "bis-b": "1", "bis-tolerancia": "1e-6", "bis-maxiter": "50", "bis-tipoerro": "absoluto", "bis-criterio": "erro" } },
    { grupo: "Por que não roda?", nome: "1/x em [−1, 2] (assíntota)", enunciado: "f troca de sinal sem ser contínua: a bisseção “converge” para a assíntota x = 0, que não é raiz.",
      campos: { "bis-funcao": "1/x", "bis-a": "-1", "bis-b": "2", "bis-tolerancia": "1e-6", "bis-maxiter": "50", "bis-tipoerro": "absoluto", "bis-criterio": "erro" } },
    { grupo: "Por que não roda?", nome: "tg(x) em [1, 2] (assíntota em π/2)", enunciado: "Mesmo caso do 1/x: a troca de sinal vem da assíntota em π/2 ≈ 1,5708.",
      campos: { "bis-funcao": "tg(x)", "bis-a": "1", "bis-b": "2", "bis-tolerancia": "1e-6", "bis-maxiter": "50", "bis-tipoerro": "absoluto", "bis-criterio": "erro" } },
  ],
  secante: [
    { grupo: "Slides (Cap. 3)", nome: "Exemplo 7: e⁻ˣ − x, x₀ = 0, x₁ = 1", enunciado: "Slides, Exemplo 7: f(x) = e⁻ˣ − x, x₀ = 0, x₁ = 1 e ε = 10⁻². O slide para quando ER% < ε (erro relativo em porcentagem): 4 iterações.",
      campos: { "sec-funcao": "e^(-x) - x", "sec-x0": "0", "sec-x1": "1", "sec-tolerancia": "10^-2", "sec-maxiter": "50", "sec-tipoerro": "percentual", "sec-criterio": "erro" } },
    { grupo: "Lista 4 pela secante", nome: "Q1: eˣ − 3x, x₀ = 1, x₁ = 2", enunciado: "A função da Lista 4, Q1, resolvida pela secante com x₀ = 1, x₁ = 2 e ε = 10⁻⁵ (compare com as iterações da bisseção).",
      campos: { "sec-funcao": "e^x - 3x", "sec-x0": "1", "sec-x1": "2", "sec-tolerancia": "10^-5", "sec-maxiter": "20", "sec-tipoerro": "absoluto", "sec-criterio": "erro" } },
    { grupo: "Lista 4 pela secante", nome: "Q4: x³ − 9x + 3, x₀ = 0, x₁ = 1", enunciado: "A função da Lista 4, Q4, pela secante com x₀ = 0, x₁ = 1 e ε = 10⁻³.",
      campos: { "sec-funcao": "x^3 - 9x + 3", "sec-x0": "0", "sec-x1": "1", "sec-tolerancia": "10^-3", "sec-maxiter": "15", "sec-tipoerro": "absoluto", "sec-criterio": "erro" } },
    { grupo: "Clássicos", nome: "x³ − 2x − 5, x₀ = 2, x₁ = 3", enunciado: "Exemplo clássico: f(x) = x³ − 2x − 5, x₀ = 2, x₁ = 3, ε = 10⁻⁶. Converge em 6 iterações, com ordem ≈ 1,6.",
      campos: { "sec-funcao": "x^3 - 2x - 5", "sec-x0": "2", "sec-x1": "3", "sec-tolerancia": "10^-6", "sec-maxiter": "50", "sec-tipoerro": "absoluto", "sec-criterio": "erro" } },
    { grupo: "Clássicos", nome: "Fazer exatamente 3 iterações", enunciado: "Quando a questão pede “faça 3 iterações” (sem ε): x³ − 2x − 5, x₀ = 2, x₁ = 3.",
      campos: { "sec-funcao": "x^3 - 2x - 5", "sec-x0": "2", "sec-x1": "3", "sec-maxiter": "3", "sec-tipoerro": "absoluto", "sec-criterio": "fixo" } },
    { grupo: "Por que não roda?", nome: "cos(x), x₀ = −1, x₁ = 1 (função par)", enunciado: "f(x₀) = f(x₁) porque cos é par: a reta secante fica horizontal (divisão por zero).",
      campos: { "sec-funcao": "cos(x)", "sec-x0": "-1", "sec-x1": "1", "sec-tolerancia": "1e-6", "sec-maxiter": "50", "sec-tipoerro": "absoluto", "sec-criterio": "erro" } },
    { grupo: "Por que não roda?", nome: "atan(x), x₀ = 3, x₁ = 4 (diverge)", enunciado: "Longe da raiz, atan é quase plana: a reta corta o eixo muito longe e o método diverge.",
      campos: { "sec-funcao": "atan(x)", "sec-x0": "3", "sec-x1": "4", "sec-tolerancia": "1e-6", "sec-maxiter": "50", "sec-tipoerro": "absoluto", "sec-criterio": "erro" } },
    { grupo: "Por que não roda?", nome: "ln(x), x₀ = 0,5, x₁ = 5 (sai do domínio)", enunciado: "O próximo ponto cai em x < 0, onde ln não existe.",
      campos: { "sec-funcao": "ln(x)", "sec-x0": "0.5", "sec-x1": "5", "sec-tolerancia": "1e-6", "sec-maxiter": "50", "sec-tipoerro": "absoluto", "sec-criterio": "erro" } },
    { grupo: "Por que não roda?", nome: "x² + 1 (não tem raiz real)", enunciado: "x² + 1 > 0 para todo x: não há raiz real para encontrar.",
      campos: { "sec-funcao": "x^2 + 1", "sec-x0": "0.5", "sec-x1": "3", "sec-tolerancia": "1e-6", "sec-maxiter": "50", "sec-tipoerro": "absoluto", "sec-criterio": "erro" } },
    { grupo: "Por que não roda?", nome: "(x − 1)², raiz dupla (lenta)", enunciado: "Em raiz múltipla, a secante perde a velocidade (convergência linear).",
      campos: { "sec-funcao": "(x-1)^2", "sec-x0": "0", "sec-x1": "0.5", "sec-tolerancia": "1e-12", "sec-maxiter": "15", "sec-tipoerro": "absoluto", "sec-criterio": "erro" } },
  ],
  gauss: [
    { grupo: "Lista 6", nome: "Q1a (sem pivoteamento)", enunciado: "Lista 6, Q1a, por eliminação de Gauss. Gabarito: x = (1, 2, 1, 0).",
      campos: { "gauss-matriz": "2 2 1 1\n1 -1 2 -1\n3 2 -3 -2\n4 3 2 1", "gauss-vetor": "7 1 4 12", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "total", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q1b (sem pivoteamento)", enunciado: "Lista 6, Q1b, por eliminação de Gauss. Gabarito: x = (2, −1, 0, −1).",
      campos: { "gauss-matriz": "3 2 0 1\n9 8 -3 4\n-6 4 -8 0\n3 -8 3 -4", "gauss-vetor": "3 6 -16 18", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "total", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q2a (três casas decimais)", enunciado: "Lista 6, Q2a: número de soluções, trabalhando com três casas decimais. Gabarito: infinitas soluções (SPI).",
      campos: { "gauss-matriz": "3 -2 5 1\n-6 4 -8 1\n9 -6 19 1\n6 -4 -6 15", "gauss-vetor": "7 -9 23 11", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "casas", "gauss-digitos": "3", "gauss-casas": "3" } },
    { grupo: "Lista 6", nome: "Q2b (três casas decimais)", enunciado: "Lista 6, Q2b: número de soluções, trabalhando com três casas decimais. Gabarito: não admite soluções (SI).",
      campos: { "gauss-matriz": "0,252 0,36 0,12\n0,112 0,16 0,24\n0,147 0,21 0,25", "gauss-vetor": "7 8 9", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "casas", "gauss-digitos": "3", "gauss-casas": "3" } },
    { grupo: "Lista 6", nome: "Q3: Q1a com pivoteamento parcial", enunciado: "Lista 6, Q3: refazer a Q1a com pivoteamento parcial.",
      campos: { "gauss-matriz": "2 2 1 1\n1 -1 2 -1\n3 2 -3 -2\n4 3 2 1", "gauss-vetor": "7 1 4 12", "gauss-pivoteamento": "parcial", "gauss-aritmetica": "total", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q3: Q1b com pivoteamento parcial", enunciado: "Lista 6, Q3: refazer a Q1b com pivoteamento parcial.",
      campos: { "gauss-matriz": "3 2 0 1\n9 8 -3 4\n-6 4 -8 0\n3 -8 3 -4", "gauss-vetor": "3 6 -16 18", "gauss-pivoteamento": "parcial", "gauss-aritmetica": "total", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q3: Q2a com pivoteamento parcial", enunciado: "Lista 6, Q3: refazer a Q2a com pivoteamento parcial (três casas decimais).",
      campos: { "gauss-matriz": "3 -2 5 1\n-6 4 -8 1\n9 -6 19 1\n6 -4 -6 15", "gauss-vetor": "7 -9 23 11", "gauss-pivoteamento": "parcial", "gauss-aritmetica": "casas", "gauss-digitos": "3", "gauss-casas": "3" } },
    { grupo: "Lista 6", nome: "Q3: Q2b com pivoteamento parcial", enunciado: "Lista 6, Q3: refazer a Q2b com pivoteamento parcial (três casas decimais).",
      campos: { "gauss-matriz": "0,252 0,36 0,12\n0,112 0,16 0,24\n0,147 0,21 0,25", "gauss-vetor": "7 8 9", "gauss-pivoteamento": "parcial", "gauss-aritmetica": "casas", "gauss-digitos": "3", "gauss-casas": "3" } },
    { grupo: "Lista 6", nome: "Q6: Hilbert 3×3 (det e Gauss)", enunciado: "Lista 6, Q6: (a) determinante; (b) Gauss; (c) Gauss com pivoteamento parcial. Gabarito: x = (1, 1, 1). Troque o pivoteamento para fazer o item (c).",
      campos: { "gauss-matriz": HILBERT(3), "gauss-vetor": "11/6 13/12 47/60", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "total", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q7: Hilbert 4×4 (det e Gauss)", enunciado: "Lista 6, Q7: determinante e solução. Gabarito: x = (1, 1, 1, 1). Repare no aviso de mal condicionamento.",
      campos: { "gauss-matriz": HILBERT(4), "gauss-vetor": "25/12 77/60 57/60 319/420", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "total", "gauss-casas": "6" } },
    { grupo: "Lista 6", nome: "Q8: fatoração LU", enunciado: "Lista 6, Q8: fatoração LU de A (sem vetor b). Gabarito: L = [1 0 0; 2 1 0; 3 1 1], U = [1 1 1; 0 −1 −3; 0 0 0].",
      campos: { "gauss-matriz": "1 1 1\n2 1 -1\n3 2 0", "gauss-vetor": "", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "total", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q10: resolver por LU", enunciado: "Lista 6, Q10: resolver pela decomposição LU (veja “Resolvendo por LU” no passo a passo). Gabarito: x = (0, 1, −2).",
      campos: { "gauss-matriz": "5 2 1\n3 1 4\n1 1 3", "gauss-vetor": "0 -7 -5", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "total", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q12: seis casas decimais", enunciado: "Lista 6, Q12: Gauss trabalhando com seis casas decimais. Gabarito: x = (3, −2,5, 7).",
      campos: { "gauss-matriz": "3 -0,1 -0,2\n0,1 7 -0,3\n0,3 -0,2 10", "gauss-vetor": "7,85 -19,3 71,4", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "casas", "gauss-digitos": "6", "gauss-casas": "6" } },
    { grupo: "Lista 6", nome: "Q13 I: F(10, 3), sem pivoteamento", enunciado: "Lista 6, Q13 (I): F(10, 3, lm, ln), sem pivoteamento. O pivô 0,0002 gera multiplicador 10000 e x₁ sai 0 (errado).",
      campos: { "gauss-matriz": "0,0002 2\n2 2", "gauss-vetor": "5 6", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "significativos", "gauss-digitos": "3", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q13 II: F(10, 3), com pivoteamento", enunciado: "Lista 6, Q13 (II): F(10, 3, lm, ln), com pivoteamento. x₁ = 0,500, perto do exato 5000/9999.",
      campos: { "gauss-matriz": "0,0002 2\n2 2", "gauss-vetor": "5 6", "gauss-pivoteamento": "parcial", "gauss-aritmetica": "significativos", "gauss-digitos": "3", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q14 III: sem pivoteamento (4 algarismos)", enunciado: "Lista 6, Q14 (III): sem pivoteamento. O enunciado não diz o sistema de ponto flutuante; usamos 4 algarismos significativos (os dados vêm com 5, como 2,0001). Troque k para testar outros.",
      campos: { "gauss-matriz": "0,0003 3,0000\n1,0000 1,0000", "gauss-vetor": "2,0001 1,0000", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "significativos", "gauss-digitos": "4", "gauss-casas": "4" } },
    { grupo: "Lista 6", nome: "Q14 IV: com pivoteamento (4 algarismos)", enunciado: "Lista 6, Q14 (IV): com pivoteamento, 4 algarismos significativos. Exato: x = (1/3, 2/3).",
      campos: { "gauss-matriz": "0,0003 3,0000\n1,0000 1,0000", "gauss-vetor": "2,0001 1,0000", "gauss-pivoteamento": "parcial", "gauss-aritmetica": "significativos", "gauss-digitos": "4", "gauss-casas": "4" } },
    { grupo: "Outros", nome: "Pivô zero: [0 1; 1 0] sem pivoteamento", enunciado: "O sistema tem solução, mas sem pivoteamento o primeiro pivô é 0 e o método trava. Use o botão sugerido para rodar com pivoteamento.",
      campos: { "gauss-matriz": "0 1\n1 0", "gauss-vetor": "2 3", "gauss-pivoteamento": "nenhum", "gauss-aritmetica": "total", "gauss-casas": "4" } },
    { grupo: "Outros", nome: "Hilbert 8×8 (mal condicionado)", enunciado: "Matriz de Hilbert 8×8 com b = soma das linhas (solução exata: tudo 1). Mesmo com pivoteamento, a solução numérica erra na 7ª casa.",
      campos: { "gauss-matriz": HILBERT(8), "gauss-vetor": "", "gauss-pivoteamento": "parcial", "gauss-aritmetica": "total", "gauss-casas": "8" }, bSomaLinhas: true },
  ],
};

// b = soma de cada linha (frações exatas), para a solução ser x = (1, 1, ..., 1)
function somaDasLinhas(textoA) {
  return textoA.split("\n").map((linha) => {
    const soma = linha.trim().split(/\s+/).map(fracaoDeTexto).reduce((s, q) => s.mais(q), new Fracao(0n));
    return soma.toString();
  }).join(" ");
}

function preencherCampos(campos) {
  Object.entries(campos).forEach(([id, valor]) => {
    const campo = pegar(id);
    if (!campo) return;
    campo.value = valor;
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function montarMenusDeExemplos() {
  const botoes = { bissecao: "botao-bissecao", secante: "botao-secante", gauss: "botao-gauss" };
  const prefixos = { bissecao: "bis", secante: "sec", gauss: "gauss" };
  Object.entries(EXEMPLOS).forEach(([metodo, lista]) => {
    const menu = pegar(`${prefixos[metodo]}-exemplo`);
    const grupos = {};
    lista.forEach((ex, i) => {
      if (!grupos[ex.grupo]) {
        grupos[ex.grupo] = document.createElement("optgroup");
        grupos[ex.grupo].label = ex.grupo;
        menu.appendChild(grupos[ex.grupo]);
      }
      const opcao = document.createElement("option");
      opcao.value = String(i);
      opcao.textContent = ex.nome;
      grupos[ex.grupo].appendChild(opcao);
    });
    menu.addEventListener("change", () => {
      if (menu.value === "") return;
      const ex = lista[Number(menu.value)];
      const campos = { ...ex.campos };
      if (ex.bSomaLinhas) campos["gauss-vetor"] = somaDasLinhas(campos["gauss-matriz"]);
      preencherCampos(campos);
      const caixa = pegar(`${prefixos[metodo]}-enunciado`);
      caixa.innerHTML = `<strong>${escapar(ex.grupo)}:</strong> ${escapar(ex.enunciado)}`;
      caixa.hidden = false;
      pegar(botoes[metodo]).click();
      menu.value = "";
    });
  });
}
montarMenusDeExemplos();

/* ---------------------------------------------------------------------
   F. MATRIZ EM GRADE (uma caixinha por número, sempre igual às caixas de texto)
   --------------------------------------------------------------------- */

const ORDEM_MAXIMA_GRADE = 10;
let sincronizandoGrade = false;

function lerTextoParaGrade() {
  const linhas = pegar("gauss-matriz").value.split("\n").map((l) => l.trim()).filter((l) => l !== "").map(separarNumeros);
  const b = separarNumeros(pegar("gauss-vetor").value.replace(/\n/g, " "));
  const n = Math.min(ORDEM_MAXIMA_GRADE, Math.max(1, linhas.length, ...linhas.map((l) => l.length), b.length));
  return { linhas, b, n };
}

function desenharGrade(n, linhas, b) {
  const caixa = pegar("gauss-grade");
  const cab = Array.from({ length: n }, (_, j) => `<th>x${sub(j + 1)}</th>`).join("") + `<th class="separador">b</th>`;
  const corpo = Array.from({ length: n }, (_, i) => {
    const celulas = Array.from({ length: n }, (_, j) => {
      const v = (linhas[i] && linhas[i][j]) || "";
      return `<td><input type="text" class="celula" data-i="${i}" data-j="${j}" value="${escapar(v)}" placeholder="0" aria-label="A linha ${i + 1}, coluna ${j + 1}" autocomplete="off"></td>`;
    }).join("");
    return `<tr>${celulas}<td class="separador"><input type="text" class="celula" data-i="${i}" data-j="b" value="${escapar(b[i] || "")}" placeholder="—" aria-label="b linha ${i + 1}" autocomplete="off"></td></tr>`;
  }).join("");
  caixa.innerHTML = `<table class="grade"><thead><tr>${cab}</tr></thead><tbody>${corpo}</tbody></table>`;
  pegar("gauss-grade-n").textContent = String(n);
}

function gradeParaTexto() {
  const celulas = [...pegar("gauss-grade").querySelectorAll(".celula")];
  const n = Number(pegar("gauss-grade-n").textContent);
  const A = Array.from({ length: n }, () => new Array(n).fill("0"));
  const b = new Array(n).fill("");
  celulas.forEach((c) => {
    const v = c.value.trim().replace(/\s+/g, "");
    if (c.dataset.j === "b") b[Number(c.dataset.i)] = v;
    else A[Number(c.dataset.i)][Number(c.dataset.j)] = v === "" ? "0" : v;
  });
  sincronizandoGrade = true;
  pegar("gauss-matriz").value = A.map((l) => l.join(" ")).join("\n");
  // b vazio em todas as linhas = sem vetor b (só det e LU); se alguma linha tem b, as vazias valem 0
  pegar("gauss-vetor").value = b.every((v) => v === "") ? "" : b.map((v) => (v === "" ? "0" : v)).join(" ");
  pegar("gauss-matriz").dispatchEvent(new Event("input", { bubbles: true }));
  sincronizandoGrade = false;
}

function atualizarGradeDoTexto() {
  if (sincronizandoGrade || !pegar("gauss-grade-caixa").open) return;
  const { linhas, b, n } = lerTextoParaGrade();
  desenharGrade(n, linhas, b);
}

function mudarOrdemGrade(delta) {
  const n = Number(pegar("gauss-grade-n").textContent);
  const novo = Math.max(1, Math.min(ORDEM_MAXIMA_GRADE, n + delta));
  if (novo === n) return;
  const celulas = [...pegar("gauss-grade").querySelectorAll(".celula")];
  const linhas = Array.from({ length: novo }, () => new Array(novo).fill("0"));
  const b = new Array(novo).fill("");
  celulas.forEach((c) => {
    const i = Number(c.dataset.i);
    if (i >= novo) return;
    if (c.dataset.j === "b") b[i] = c.value;
    else if (Number(c.dataset.j) < novo) linhas[i][Number(c.dataset.j)] = c.value === "" ? "0" : c.value;
  });
  desenharGrade(novo, linhas, b);
  gradeParaTexto();
}

pegar("gauss-grade-caixa").addEventListener("toggle", () => {
  if (pegar("gauss-grade-caixa").open) atualizarGradeDoTexto();
});
pegar("gauss-grade").addEventListener("input", (evento) => {
  if (evento.target.classList.contains("celula")) gradeParaTexto();
});
pegar("gauss-matriz").addEventListener("input", atualizarGradeDoTexto);
pegar("gauss-vetor").addEventListener("input", atualizarGradeDoTexto);
pegar("gauss-grade-menos").addEventListener("click", () => mudarOrdemGrade(-1));
pegar("gauss-grade-mais").addEventListener("click", () => mudarOrdemGrade(1));


/* ---------------------------------------------------------------------
   G. COPIAR, IMPRIMIR, ENTER, N FIXO E CAMPOS LEMBRADOS
   --------------------------------------------------------------------- */

// Número no formato do Excel/Word em português (vírgula decimal)
const celulaParaCopiar = (texto) => {
  const t = texto.trim();
  return /^[-−+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? t.replace("−", "-").replace(".", ",").replace(/e/i, "E") : t;
};
const tabelaParaTexto = (tabela) => [...tabela.querySelectorAll("tr")]
  .map((tr) => [...tr.children].map((c) => celulaParaCopiar(c.innerText)).join("\t")).join("\n");

function textoParaCopiar(idSaida) {
  const saida = pegar(idSaida);
  if (idSaida === "saida-gauss") {
    const partes = [...saida.querySelectorAll(".resultado, .erro")].slice(0, 1).map((p) => p.innerText.trim());
    const artigos = [...saida.querySelectorAll(".passo")];
    const final = artigos.filter((a) => /eliminação|Retrossubstituição/.test(a.querySelector("h4").innerText)).pop();
    if (final) partes.push("Matriz final [U | b]:", tabelaParaTexto(final.querySelector("table")));
    return partes.join("\n");
  }
  const tabela = [...saida.querySelectorAll("table")].find((t) => !t.classList.contains("matriz"));
  return tabela ? tabelaParaTexto(tabela) : "";
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (erro) {
    // Plano B (navegador sem permissão para a área de transferência)
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    area.remove();
    return ok;
  }
}

document.querySelectorAll(".copiar").forEach((botao) => {
  const original = botao.textContent;
  botao.addEventListener("click", async () => {
    const texto = textoParaCopiar(botao.dataset.saida);
    botao.textContent = !texto ? "Nada para copiar: rode primeiro" : (await copiarTexto(texto)) ? "Copiado ✓ (cole no Excel ou Word)" : "Não consegui copiar";
    setTimeout(() => { botao.textContent = original; }, 2200);
  });
});

// Imprimir: abre todas as seções recolhidas do painel atual, imprime e depois devolve como estava
document.querySelectorAll(".imprimir").forEach((botao) => {
  botao.addEventListener("click", () => {
    const painel = botao.closest(".painel");
    const fechados = [...painel.querySelectorAll("details:not([open])")].filter((d) => !d.classList.contains("ferramenta") || d.querySelector(".saida:not(:empty)"));
    fechados.forEach((d) => { d.open = true; });
    document.body.dataset.imprimindo = painel.id;
    const restaurar = () => {
      fechados.forEach((d) => { d.open = false; });
      delete document.body.dataset.imprimindo;
      window.removeEventListener("afterprint", restaurar);
    };
    window.addEventListener("afterprint", restaurar);
    window.print();
  });
});

// Enter num campo de texto roda o cálculo daquele painel (ou da ferramenta em que o campo está)
document.addEventListener("keydown", (evento) => {
  if (evento.key !== "Enter" || evento.target.tagName !== "INPUT" || evento.isComposing) return;
  const ferramenta = evento.target.closest(".ferramenta");
  if (ferramenta && ferramenta.querySelector("[id$='-sinais-botao']")) {
    evento.preventDefault();
    ferramenta.querySelector("[id$='-sinais-botao']").click();
    return;
  }
  const painel = evento.target.closest(".painel");
  const principal = painel && painel.querySelector(".botoes .botao:not(.secundario)");
  if (principal) {
    evento.preventDefault();
    principal.click();
  }
});

// Com "Fazer exatamente N iterações" a tolerância não é usada: o campo fica apagado
function atualizarCampoTolerancia(prefixo) {
  const fixo = pegar(`${prefixo}-criterio`).value === "fixo";
  pegar(`${prefixo}-tolerancia`).disabled = fixo;
  pegar(`${prefixo}-tolerancia`).title = fixo ? "Com N fixo a tolerância não é usada" : "";
}
["bis", "sec"].forEach((p) => {
  pegar(`${p}-criterio`).addEventListener("change", () => atualizarCampoTolerancia(p));
  atualizarCampoTolerancia(p);
});

// Campos lembrados neste navegador (localStorage). Qualquer falha aqui é ignorada: o site funciona sem isso.
const CHAVE_SALVOS = "caderno-metodos-numericos-v2";
const camposSalvaveis = () => [...document.querySelectorAll("main input[id], main select[id], main textarea[id]")]
  .filter((c) => !c.id.endsWith("-exemplo") && !c.classList.contains("celula"));

function salvarCampos() {
  try {
    const dados = { aba: document.querySelector("[role='tab'][aria-selected='true']").dataset.alvo, campos: {} };
    camposSalvaveis().forEach((c) => { dados.campos[c.id] = c.value; });
    localStorage.setItem(CHAVE_SALVOS, JSON.stringify(dados));
  } catch (erro) { /* sem localStorage (modo privado, por exemplo): segue sem salvar */ }
}

function restaurarCampos() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_SALVOS) || "null");
    if (!dados || typeof dados !== "object") return;
    camposSalvaveis().forEach((c) => {
      if (!dados.campos || typeof dados.campos[c.id] !== "string") return;
      // Num select, só aceita um valor que exista na lista (versões antigas do site podiam ter outras opções)
      if (c.tagName === "SELECT" && ![...c.options].some((o) => o.value === dados.campos[c.id])) return;
      c.value = dados.campos[c.id];
    });
    if (dados.aba && pegar(dados.aba)) ativarAba(dados.aba);
  } catch (erro) { /* dados salvos corrompidos: ignora */ }
}

let temporizadorSalvar = null;
document.querySelector("main").addEventListener("input", () => {
  clearTimeout(temporizadorSalvar);
  temporizadorSalvar = setTimeout(salvarCampos, 300);
});
document.querySelector("main").addEventListener("change", salvarCampos);
document.querySelectorAll("[role='tab']").forEach((aba) => aba.addEventListener("click", salvarCampos));
pegar("restaurar-padrao").addEventListener("click", () => {
  try { localStorage.removeItem(CHAVE_SALVOS); } catch (erro) { /* nada a apagar */ }
  location.reload();
});

restaurarCampos();
["bis", "sec"].forEach(atualizarCampoTolerancia);
atualizarCampoDigitos();
