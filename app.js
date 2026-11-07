"use strict";

/* =====================================================================
   CADERNO DE MÉTODOS NUMÉRICOS
   Bisseção, Secante e Eliminação de Gauss, tudo rodando no navegador.

   Organização do arquivo:
     1. Leitura da função f(x) digitada (analisador de expressões)
     2. Utilidades de formatação e de leitura dos campos
     3. Bisseção
     4. Secante
     5. Eliminação de Gauss
     6. Ligação com a página (abas e botões)
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. LEITURA DA FUNÇÃO f(x)
   Em vez de usar eval(), a expressão é lida por um pequeno analisador:
   ele só aceita números, a variável x, operadores + - * / ^ e as
   funções listadas abaixo. Assim nada além de matemática é executado.
   --------------------------------------------------------------------- */

const CONSTANTES = { pi: Math.PI, e: Math.E };

// nome: [função do JavaScript, quantidade de argumentos]
const FUNCOES = {
  sin: [Math.sin, 1], cos: [Math.cos, 1], tan: [Math.tan, 1],
  asin: [Math.asin, 1], acos: [Math.acos, 1], atan: [Math.atan, 1],
  exp: [Math.exp, 1], ln: [Math.log, 1], log: [Math.log10, 1],
  sqrt: [Math.sqrt, 1], abs: [Math.abs, 1], pow: [Math.pow, 2],
};

const tem = (objeto, chave) => Object.prototype.hasOwnProperty.call(objeto, chave);

function compilarFuncao(texto) {
  // Remove espaços e aceita ** como sinônimo de ^
  const entrada = texto.replace(/\s+/g, "").replace(/\*\*/g, "^");
  if (entrada === "") throw new Error("Digite a função f(x).");

  let pos = 0; // posição do caractere que estamos lendo
  const olhar = () => entrada[pos];
  const esperar = (caractere) => {
    if (entrada[pos] !== caractere) {
      throw new Error(`Faltou "${caractere}" na função (perto da posição ${pos + 1}).`);
    }
    pos++;
  };

  // Cada "ler..." devolve uma função (x) => valor, montada a partir da expressão.

  // soma := termo (('+' | '-') termo)*
  function lerSoma() {
    let esquerda = lerTermo();
    while (olhar() === "+" || olhar() === "-") {
      const operador = entrada[pos++];
      const a = esquerda;
      const b = lerTermo();
      esquerda = operador === "+" ? (x) => a(x) + b(x) : (x) => a(x) - b(x);
    }
    return esquerda;
  }

  // termo := unário (('*' | '/') unário)*
  function lerTermo() {
    let esquerda = lerUnario();
    while (olhar() === "*" || olhar() === "/") {
      const operador = entrada[pos++];
      const a = esquerda;
      const b = lerUnario();
      esquerda = operador === "*" ? (x) => a(x) * b(x) : (x) => a(x) / b(x);
    }
    return esquerda;
  }

  // unário := '-' unário | '+' unário | potência
  function lerUnario() {
    if (olhar() === "-") { pos++; const a = lerUnario(); return (x) => -a(x); }
    if (olhar() === "+") { pos++; return lerUnario(); }
    return lerPotencia();
  }

  // potência := primário ('^' unário)?   (assim, -x^2 vale -(x^2))
  function lerPotencia() {
    const base = lerPrimario();
    if (olhar() === "^") {
      pos++;
      const expoente = lerUnario();
      return (x) => Math.pow(base(x), expoente(x));
    }
    return base;
  }

  // primário := número | x | constante | função(args) | '(' soma ')'
  function lerPrimario() {
    const c = olhar();
    if (c === undefined) throw new Error("A função terminou antes do esperado.");

    if (c === "(") {
      pos++;
      const dentro = lerSoma();
      esperar(")");
      return dentro;
    }

    if (/[\d.]/.test(c)) {
      const regex = /(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/y;
      regex.lastIndex = pos;
      const achado = regex.exec(entrada);
      if (!achado) throw new Error(`Número inválido na função (posição ${pos + 1}).`);
      pos += achado[0].length;
      const valor = Number(achado[0]);
      return () => valor;
    }

    if (/[a-zA-Z_]/.test(c)) {
      const regex = /[a-zA-Z_]+/y;
      regex.lastIndex = pos;
      const nome = regex.exec(entrada)[0];
      pos += nome.length;

      if (nome === "x") return (x) => x;
      if (tem(CONSTANTES, nome)) { const v = CONSTANTES[nome]; return () => v; }

      if (tem(FUNCOES, nome)) {
        const [funcao, quantidade] = FUNCOES[nome];
        esperar("(");
        const argumentos = [lerSoma()];
        while (olhar() === ",") { pos++; argumentos.push(lerSoma()); }
        esperar(")");
        if (argumentos.length !== quantidade) {
          throw new Error(`"${nome}" precisa de ${quantidade} argumento(s).`);
        }
        return (x) => funcao(...argumentos.map((arg) => arg(x)));
      }

      throw new Error(
        `"${nome}" não é reconhecido. Use x, pi, e e as funções sin, cos, tan, asin, acos, atan, exp, ln, log, sqrt, abs, pow.`
      );
    }

    throw new Error(`Caractere inesperado "${c}" na função.`);
  }

  const arvore = lerSoma();
  if (pos < entrada.length) {
    throw new Error(`Não entendi "${entrada.slice(pos)}". Se for multiplicação, use * (ex.: 2*x).`);
  }
  return (x) => arvore(x);
}


/* ---------------------------------------------------------------------
   2. UTILIDADES
   --------------------------------------------------------------------- */

// Mostra números com casas fixas; muito pequenos ou grandes viram notação científica
function formatar(valor, casas = 6) {
  if (!Number.isFinite(valor)) return String(valor);
  if (valor === 0) return "0";
  const modulo = Math.abs(valor);
  if (modulo < 1e-4 || modulo >= 1e7) return valor.toExponential(3);
  return valor.toFixed(casas);
}

const pegar = (id) => document.getElementById(id);

// Lê um campo de texto como número (aceita "1e-6" e vírgula decimal)
function lerNumero(id, nomeDoCampo) {
  const bruto = pegar(id).value.trim().replace(",", ".");
  const valor = Number(bruto);
  if (bruto === "" || !Number.isFinite(valor)) {
    throw new Error(`O campo "${nomeDoCampo}" precisa ser um número.`);
  }
  return valor;
}

function lerTolerancia(id) {
  const tolerancia = lerNumero(id, "Tolerância");
  if (tolerancia <= 0) throw new Error("A tolerância precisa ser maior que zero.");
  return tolerancia;
}

function lerMaxIteracoes(id) {
  const maximo = lerNumero(id, "Máximo de iterações");
  if (!Number.isInteger(maximo) || maximo < 1 || maximo > 1000) {
    throw new Error("O máximo de iterações precisa ser um inteiro entre 1 e 1000.");
  }
  return maximo;
}

// Monta uma tabela HTML. Só recebe textos gerados pelo próprio programa.
function montarTabela(cabecalhos, linhas) {
  const cabeca = cabecalhos.map((c) => `<th scope="col">${c}</th>`).join("");
  const corpo = linhas
    .map((linha) => `<tr>${linha.map((celula) => `<td>${celula}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="rolagem"><table><thead><tr>${cabeca}</tr></thead><tbody>${corpo}</tbody></table></div>`;
}

const mostrarErro = (saida, erro) => {
  saida.innerHTML = `<div class="erro">${erro.message}</div>`;
};


/* ---------------------------------------------------------------------
   3. ERRO, CRITÉRIO DE PARADA E RESULTADO (usados por bisseção e secante)
   Erro absoluto: |xₖ − xₖ₋₁|      Erro relativo: |xₖ − xₖ₋₁| / |xₖ|
   Critério: "erro" (erro ≤ ε), "fx" (|f(x)| ≤ ε) ou "ambos" (basta um).
   --------------------------------------------------------------------- */

function calcularErro(xNovo, xAnterior, tipo) {
  if (xAnterior === null) return null; // 1ª iteração da bisseção: ainda não há x anterior
  const diferenca = Math.abs(xNovo - xAnterior);
  if (tipo === "relativo") {
    if (xNovo === 0) return diferenca === 0 ? 0 : Infinity; // evita dividir por zero
    return diferenca / Math.abs(xNovo);
  }
  return diferenca;
}

function atendeParada(erro, fx, tolerancia, criterio) {
  const erroOk = erro !== null && erro <= tolerancia;
  const fxOk = Math.abs(fx) <= tolerancia;
  if (criterio === "erro") return erroOk;
  if (criterio === "fx") return fxOk;
  return erroOk || fxOk;
}

const textoErro = (e) => (e === null ? "—" : formatar(e));
const lerOpcoesErro = (p) => ({ tipoErro: pegar(p + "-tipoerro").value, criterio: pegar(p + "-criterio").value });

// Resumo comum: raiz, |f(x)|, nº de iterações e aviso se f(x) ainda está grande
function blocoResultado(r, motivoFalha, extras = []) {
  const titulo = r.sucesso
    ? `<p class="resultado">Raiz aproximada: ${formatar(r.raiz, 8)}</p>`
    : `<p class="erro">${motivoFalha} Melhor aproximação: ${formatar(r.raiz, 8)}</p>`;
  const linhas = [`|f(x)| = ${formatar(Math.abs(r.fx))}`, `${r.passos.length} iteração(ões)`, ...extras];
  let html = titulo + `<p class="aviso">${linhas.join(" · ")}</p>`;
  if (r.sucesso && Math.abs(r.fx) > 1e-3) {
    html += `<p class="erro">Atenção: o erro ficou pequeno, mas |f(x)| continua grande. Isso indica descontinuidade
      (ex.: assíntota, como 1/x em x = 0). O Teorema de Bolzano exige f contínua em [a, b]; esse valor NÃO é raiz.</p>`;
  }
  return html;
}

/* ---------------------------------------------------------------------
   BISSEÇÃO. Base teórica: Teorema de Bolzano (valor intermediário):
   se f é contínua em [a, b] e f(a)·f(b) < 0, existe c em (a, b) com f(c) = 0.
   Converge sempre (linear, razão 1/2); iterações: n ≥ log₂((b − a) / ε).
   --------------------------------------------------------------------- */

function bissecao(f, a, b, tolerancia, maxIteracoes, tipoErro = "absoluto", criterio = "erro") {
  if (a > b) [a, b] = [b, a];
  if (a === b) throw new Error("Os limites a e b precisam ser diferentes.");

  let fa = f(a);
  const fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    throw new Error("A função não está definida em um dos limites do intervalo.");
  }
  if (fa === 0) return { sucesso: true, raiz: a, fx: 0, passos: [] };
  if (fb === 0) return { sucesso: true, raiz: b, fx: 0, passos: [] };
  if (fa * fb > 0) {
    throw new Error("f(a) e f(b) têm o mesmo sinal: o Teorema de Bolzano não garante raiz em [a, b]. Escolha outro intervalo.");
  }

  const passos = [];
  let x = a, fx = fa, xAnterior = null;

  for (let iteracao = 1; iteracao <= maxIteracoes; iteracao++) {
    x = (a + b) / 2; // ponto médio
    fx = f(x);
    if (!Number.isFinite(fx)) throw new Error(`f(x) ficou indefinida em x = ${formatar(x)}.`);

    const erro = calcularErro(x, xAnterior, tipoErro);
    passos.push({ iteracao, a, b, x, fx, erro, cota: (b - a) / 2 });

    if (atendeParada(erro, fx, tolerancia, criterio)) return { sucesso: true, raiz: x, fx, passos };

    // Fica com a metade em que ainda há troca de sinal
    if (fa * fx < 0) b = x; else { a = x; fa = fx; }
    xAnterior = x;
  }
  return { sucesso: false, raiz: x, fx, passos };
}

function executarBissecao() {
  const saida = pegar("saida-bissecao");
  try {
    const f = compilarFuncao(pegar("bis-funcao").value);
    const a = lerNumero("bis-a", "Limite inferior (a)");
    const b = lerNumero("bis-b", "Limite superior (b)");
    const tolerancia = lerTolerancia("bis-tolerancia");
    const maxIteracoes = lerMaxIteracoes("bis-maxiter");
    const { tipoErro, criterio } = lerOpcoesErro("bis");

    const r = bissecao(f, a, b, tolerancia, maxIteracoes, tipoErro, criterio);

    // Comparação com a teoria: n ≥ log₂((b − a)/ε)
    const extras = [];
    if (tipoErro === "absoluto" && criterio === "erro") {
      extras.push(`previsto pela teoria: ⌈log₂((b−a)/ε)⌉ = ${Math.ceil(Math.log2(Math.abs(b - a) / tolerancia))}`);
    }
    const tabela = r.passos.length
      ? montarTabela(
          ["Iteração", "a", "b", "x (ponto médio)", "f(x)", "Erro", "(b−a)/2"],
          r.passos.map((p) => [p.iteracao, formatar(p.a), formatar(p.b), formatar(p.x), formatar(p.fx), textoErro(p.erro), formatar(p.cota)])
        )
      : "";
    saida.innerHTML = blocoResultado(r, `Não convergiu em ${maxIteracoes} iterações.`, extras) + tabela;
  } catch (erro) {
    mostrarErro(saida, erro);
  }
}


/* ---------------------------------------------------------------------
   4. SECANTE. Substitui a derivada do método de Newton por uma reta
   que passa pelos dois últimos pontos:
       x_novo = x₁ − f(x₁)·(x₁ − x₀) / (f(x₁) − f(x₀))
   Ordem de convergência (quando converge): (1+√5)/2 ≈ 1,618 (superlinear).
   Não tem garantia: pode dividir por zero ou divergir.
   --------------------------------------------------------------------- */

function secante(f, x0, x1, tolerancia, maxIteracoes, tipoErro = "absoluto", criterio = "erro") {
  let xAnterior = x0, xAtual = x1;
  let fAnterior = f(xAnterior), fAtual = f(xAtual);
  if (!Number.isFinite(fAnterior) || !Number.isFinite(fAtual)) {
    throw new Error("A função não está definida em um dos valores iniciais.");
  }

  const passos = [];
  let melhor = { x: xAtual, fx: fAtual };
  const falha = (motivo) => ({ sucesso: false, raiz: melhor.x, fx: melhor.fx, passos, motivo });

  for (let iteracao = 1; iteracao <= maxIteracoes; iteracao++) {
    const denominador = fAtual - fAnterior;
    if (denominador === 0) {
      return falha("f(xₙ) = f(xₙ₋₁): a reta secante ficou horizontal e não cruza o eixo x (divisão por zero). Tente outros valores iniciais.");
    }
    const xNovo = xAtual - (fAtual * (xAtual - xAnterior)) / denominador;
    const fNovo = f(xNovo);
    const erro = calcularErro(xNovo, xAtual, tipoErro);
    passos.push({ iteracao, xAnterior, xAtual, xNovo, fNovo, erro });

    if (!Number.isFinite(xNovo) || !Number.isFinite(fNovo)) {
      return falha("O método divergiu: o próximo ponto saiu do domínio de f ou virou infinito. Tente outros valores iniciais.");
    }
    melhor = { x: xNovo, fx: fNovo };
    if (atendeParada(erro, fNovo, tolerancia, criterio)) return { sucesso: true, raiz: xNovo, fx: fNovo, passos };

    xAnterior = xAtual; fAnterior = fAtual; // avança a janela de dois pontos
    xAtual = xNovo; fAtual = fNovo;
  }
  return falha(`Não convergiu em ${maxIteracoes} iterações.`);
}

// Estima a ordem p ≈ ln(eₖ₊₁/eₖ) / ln(eₖ/eₖ₋₁) com os três últimos erros ainda acima do ruído numérico
function estimarOrdem(passos) {
  const erros = passos.map((p) => p.erro).filter((e) => e !== null && Number.isFinite(e) && e > 1e-13);
  if (erros.length < 3) return null;
  const [e0, e1, e2] = erros.slice(-3);
  const p = Math.log(e2 / e1) / Math.log(e1 / e0);
  return Number.isFinite(p) ? p : null;
}

function executarSecante() {
  const saida = pegar("saida-secante");
  try {
    const f = compilarFuncao(pegar("sec-funcao").value);
    const x0 = lerNumero("sec-x0", "Primeiro valor (x₀)");
    const x1 = lerNumero("sec-x1", "Segundo valor (x₁)");
    const tolerancia = lerTolerancia("sec-tolerancia");
    const maxIteracoes = lerMaxIteracoes("sec-maxiter");
    const { tipoErro, criterio } = lerOpcoesErro("sec");

    const r = secante(f, x0, x1, tolerancia, maxIteracoes, tipoErro, criterio);

    const ordem = estimarOrdem(r.passos);
    const extras = ordem === null ? [] : [`ordem de convergência estimada ≈ ${ordem.toFixed(2)} (teoria: 1,618)`];
    const tabela = r.passos.length
      ? montarTabela(
          ["Iteração", "xₙ₋₁", "xₙ", "xₙ₊₁", "f(xₙ₊₁)", "Erro"],
          r.passos.map((p) => [p.iteracao, formatar(p.xAnterior), formatar(p.xAtual), formatar(p.xNovo), formatar(p.fNovo), textoErro(p.erro)])
        )
      : "";
    saida.innerHTML = blocoResultado(r, r.motivo, extras) + tabela;
  } catch (erro) {
    mostrarErro(saida, erro);
  }
}


/* ---------------------------------------------------------------------
   5. ELIMINAÇÃO DE GAUSS COM PIVOTEAMENTO PARCIAL
   Para cada coluna k:
     a) escolhe como pivô a linha (de k para baixo) com maior |valor|;
     b) troca essa linha com a linha k, se necessário;
     c) zera os valores abaixo do pivô subtraindo múltiplos da linha k.
   No fim, a matriz fica triangular e resolvemos de baixo para cima.
   --------------------------------------------------------------------- */

const LIMITE_PASSOS = 10; // acima dessa ordem, o passo a passo é omitido

// Funciona para matriz quadrada de QUALQUER ordem n. Também classifica o sistema:
// possível e determinado (SPD), possível e indeterminado (SPI) ou impossível (SI).
function eliminarGauss(matrizOriginal, vetorOriginal) {
  const n = matrizOriginal.length;
  const guardar = n <= LIMITE_PASSOS; // em matrizes grandes não guardamos cada etapa
  const A = matrizOriginal.map((linha) => [...linha]);
  const b = [...vetorOriginal];
  const passos = [];
  let trocas = 0;

  // Pivô "zero" é medido em relação ao maior elemento da matriz (funciona em qualquer escala)
  const escala = Math.max(...A.flat().map(Math.abs), 1e-300);
  const limite = 1e-12 * escala;

  const registrar = (titulo, texto) => {
    if (guardar) passos.push({ titulo, texto, A: A.map((l) => [...l]), b: [...b] });
  };
  registrar("Ponto de partida", ["Matriz aumentada [A | b] como foi digitada."]);

  let linha = 0; // linha onde o próximo pivô vai ficar
  for (let coluna = 0; coluna < n && linha < n; coluna++) {
    // a) pivoteamento parcial: maior |valor| da coluna, da linha atual para baixo
    let linhaPivo = linha;
    for (let i = linha + 1; i < n; i++) {
      if (Math.abs(A[i][coluna]) > Math.abs(A[linhaPivo][coluna])) linhaPivo = i;
    }
    if (Math.abs(A[linhaPivo][coluna]) < limite) {
      registrar(`Coluna ${coluna + 1}: sem pivô`, ["Todos os valores desta coluna (da linha atual para baixo) são ≈ 0; passamos para a próxima coluna."]);
      continue;
    }
    // b) troca de linhas
    if (linhaPivo !== linha) {
      [A[linha], A[linhaPivo]] = [A[linhaPivo], A[linha]];
      [b[linha], b[linhaPivo]] = [b[linhaPivo], b[linha]];
      trocas++;
      registrar(`Coluna ${coluna + 1}: troca de linhas`, [`Operação: L${linha + 1} ↔ L${linhaPivo + 1}`]);
    }
    // c) elimina os valores abaixo do pivô
    const operacoes = [];
    for (let i = linha + 1; i < n; i++) {
      const fator = A[i][coluna] / A[linha][coluna];
      for (let j = coluna; j < n; j++) A[i][j] -= fator * A[linha][j];
      b[i] -= fator * b[linha];
      A[i][coluna] = 0; // limpa sobras de arredondamento
      if (guardar) operacoes.push(`L${i + 1} ← L${i + 1} − (${formatar(fator)})·L${linha + 1}`);
    }
    registrar(`Coluna ${coluna + 1}: eliminação`, [`Pivô = ${formatar(A[linha][coluna])}`, ...operacoes]);
    linha++;
  }

  const posto = linha; // número de pivôs encontrados
  if (posto < n) {
    // Linhas sem pivô: se alguma ficou "0 = c" com c ≠ 0 → impossível; senão → indeterminado
    const escalaB = Math.max(...b.map(Math.abs), 1);
    const impossivel = b.slice(posto).some((v) => Math.abs(v) > 1e-9 * escalaB);
    const motivo = impossivel
      ? "Sistema IMPOSSÍVEL (SI): sobrou uma linha do tipo 0 = c com c ≠ 0, então não existe solução."
      : `Sistema POSSÍVEL E INDETERMINADO (SPI): só ${posto} pivô(s) para ${n} incógnitas (det(A) = 0), então há infinitas soluções.`;
    return { passos, x: null, trocas, posto, motivo };
  }

  // Retrossubstituição: da última linha para a primeira
  const x = new Array(n).fill(0);
  const contas = [];
  for (let i = n - 1; i >= 0; i--) {
    let soma = b[i];
    for (let j = i + 1; j < n; j++) soma -= A[i][j] * x[j];
    x[i] = soma / A[i][i];
    if (guardar) contas.push(`x${i + 1} = ${formatar(x[i])}`);
  }
  registrar("Retrossubstituição", ["Resolvendo de baixo para cima:", ...contas]);
  return { passos, x, trocas, posto, motivo: null };
}

// Lê a matriz A: uma linha por linha de texto, números separados por espaço
function lerMatriz(texto) {
  const linhas = texto.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  if (linhas.length === 0) throw new Error("Digite a matriz A.");
  const matriz = linhas.map((linha) => linha.split(/[\s,;]+/).map(Number));

  if (matriz.some((linha) => linha.some((v) => !Number.isFinite(v)))) {
    throw new Error("A matriz A tem algo que não é número.");
  }
  if (matriz.some((linha) => linha.length !== matriz.length)) {
    throw new Error(`A matriz A precisa ser quadrada: ${matriz.length} linhas exigem ${matriz.length} colunas em cada linha.`);
  }
  return matriz;
}

function lerVetor(texto, tamanho) {
  const vetor = texto.trim().split(/[\s,;]+/).filter((t) => t !== "").map(Number);
  if (vetor.some((v) => !Number.isFinite(v))) throw new Error("O vetor b tem algo que não é número.");
  if (vetor.length !== tamanho) throw new Error(`O vetor b precisa ter ${tamanho} elemento(s), mas tem ${vetor.length}.`);
  return vetor;
}

// Desenha [A | b] como tabela, com uma barra antes da coluna de b
function matrizAumentadaHtml(A, b, casas) {
  const linhas = A.map((linha, i) => {
    const celulas = linha.map((v) => `<td>${formatar(v, casas)}</td>`).join("");
    return `<tr>${celulas}<td class="separador">${formatar(b[i], casas)}</td></tr>`;
  }).join("");
  return `<div class="rolagem"><table class="matriz"><tbody>${linhas}</tbody></table></div>`;
}

function executarGauss() {
  const saida = pegar("saida-gauss");
  try {
    const A = lerMatriz(pegar("gauss-matriz").value);
    const b = lerVetor(pegar("gauss-vetor").value, A.length);
    const casas = lerNumero("gauss-casas", "Casas decimais");
    if (!Number.isInteger(casas) || casas < 0 || casas > 10) {
      throw new Error("As casas decimais precisam ser um inteiro entre 0 e 10.");
    }
    const n = A.length;
    const r = eliminarGauss(A, b);

    const passosHtml = n <= LIMITE_PASSOS
      ? r.passos.map((p) => `
      <article class="passo">
        <h4>${p.titulo}</h4>
        <p>${p.texto.join("<br>")}</p>
        ${matrizAumentadaHtml(p.A, p.b, casas)}
      </article>`).join("")
      : `<p class="aviso">Matriz ${n}×${n}: os passos foram omitidos (limite de ${LIMITE_PASSOS}×${LIMITE_PASSOS}) para a página não travar. O resultado é completo.</p>`;

    let resumo;
    if (r.x) {
      // Verificação: maior diferença entre A·x e b (deve ser ≈ 0)
      let maiorDiferenca = 0;
      for (let i = 0; i < n; i++) {
        let soma = 0;
        for (let j = 0; j < n; j++) soma += A[i][j] * r.x[j];
        maiorDiferenca = Math.max(maiorDiferenca, Math.abs(soma - b[i]));
      }
      const solucao = r.x.map((v, i) => `x${i + 1} = ${formatar(v, casas)}`).join(" · ");
      resumo = `<p class="resultado">${solucao}</p>
        <p class="aviso">Ordem ${n} · ${r.trocas} troca(s) de linha · maior diferença |A·x − b| = ${formatar(maiorDiferenca)}</p>`;
    } else {
      resumo = `<p class="erro">${r.motivo}</p>`;
    }
    saida.innerHTML = resumo + (passosHtml ? `<h3>Passo a passo</h3>` + passosHtml : "");
  } catch (erro) {
    mostrarErro(saida, erro);
  }
}


/* ---------------------------------------------------------------------
   6. LIGAÇÃO COM A PÁGINA
   --------------------------------------------------------------------- */

const abas = document.querySelectorAll("[role='tab']");
const paineis = document.querySelectorAll(".painel");

// Mostra só o painel escolhido e marca a aba correspondente
function ativarAba(idDoPainel) {
  abas.forEach((aba) => {
    aba.setAttribute("aria-selected", String(aba.dataset.alvo === idDoPainel));
  });
  paineis.forEach((painel) => {
    painel.hidden = painel.id !== idDoPainel;
  });
}

abas.forEach((aba) => aba.addEventListener("click", () => ativarAba(aba.dataset.alvo)));

pegar("botao-bissecao").addEventListener("click", executarBissecao);
pegar("botao-secante").addEventListener("click", executarSecante);
pegar("botao-gauss").addEventListener("click", executarGauss);
