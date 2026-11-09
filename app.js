"use strict";

/* =====================================================================
   CADERNO DE MÉTODOS NUMÉRICOS
   Bisseção, Secante e Eliminação de Gauss, tudo rodando no navegador.

   Organização do arquivo:
     1. Leitura da função f(x) digitada (analisador de expressões)
     2. Utilidades de formatação e de leitura dos campos
     3. Erro (absoluto, relativo, ER%), critério de parada e Bisseção
     4. Secante
     5. Eliminação de Gauss (pivoteamento, aritmética arredondada, determinante, LU)
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
  // nomes usados em português e funções extras
  sen: [Math.sin, 1], tg: [Math.tan, 1], arcsen: [Math.asin, 1], arccos: [Math.acos, 1],
  arctg: [Math.atan, 1], arctan: [Math.atan, 1], sinh: [Math.sinh, 1], cosh: [Math.cosh, 1],
  tanh: [Math.tanh, 1], sec: [(v) => 1 / Math.cos(v), 1], cot: [(v) => 1 / Math.tan(v), 1], cotg: [(v) => 1 / Math.tan(v), 1],
  csc: [(v) => 1 / Math.sin(v), 1], cosec: [(v) => 1 / Math.sin(v), 1],
  log2: [Math.log2, 1], log10: [Math.log10, 1], cbrt: [Math.cbrt, 1], raiz: [Math.sqrt, 1],
  sign: [Math.sign, 1], floor: [Math.floor, 1], ceil: [Math.ceil, 1], round: [Math.round, 1],
};

const tem = (objeto, chave) => Object.prototype.hasOwnProperty.call(objeto, chave);

// Todos os nomes que o analisador conhece, do maior para o menor (assim "log10" ganha de "log")
const NOMES = [...Object.keys(FUNCOES), ...Object.keys(CONSTANTES), "x"].sort((a, b) => b.length - a.length);

// Aceita "f(x) = ...", "y = ..." e equações como "x^2 = 3 + x" (vira x^2 - (3 + x) = 0)
function compilarFuncao(texto) {
  const semPrefixo = texto.replace(/^\s*(f\s*\(\s*x\s*\)|y)\s*=(?!=)/i, "");
  const partes = semPrefixo.split("=");
  if (partes.length === 1) return compilarExpressao(semPrefixo);
  if (partes.length !== 2 || !partes[0].trim() || !partes[1].trim()) {
    throw new Error('Use um único "=" com algo dos dois lados (ex.: x^2 = 3 + x).');
  }
  const esquerda = compilarExpressao(partes[0]);
  const direita = compilarExpressao(partes[1]);
  return (x) => esquerda(x) - direita(x);
}

function compilarExpressao(texto) {
  // Remove espaços e aceita ** como sinônimo de ^
  const entrada = texto
    .toLowerCase()                // X e x, Sin e sin: tanto faz
    .replace(/(\d),(\d)/g, "$1.$2") // vírgula decimal: 0,5 vira 0.5 (em pow use "pow(x; 2)" ou "pow(x, 2)")
    .replace(/[ˆ＾]/g, "^")        // acento circunflexo digitado no lugar de ^
    .replace(/²/g, "^2").replace(/³/g, "^3") // x² e x³ copiados de outro lugar
    .replace(/[−–—]/g, "-")       // outros tipos de traço viram "menos"
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, "")
    .replace(/;/g, ",")           // ";" também separa argumentos: pow(x; 2)
    .replace(/\*\*/g, "^");
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

  // termo := unário (('*' | '/' | multiplicação implícita) fator)*
  const iniciaFator = () => /[\d.a-zA-Z_(]/.test(olhar() || "");
  function lerTermo() {
    let esquerda = lerUnario();
    while (olhar() === "*" || olhar() === "/" || iniciaFator()) {
      const a = esquerda;
      if (olhar() === "*" || olhar() === "/") {
        const operador = entrada[pos++];
        const b = lerUnario();
        esquerda = operador === "*" ? (x) => a(x) * b(x) : (x) => a(x) / b(x);
      } else {
        const b = lerPotencia(); // implícita: 2x, 3(x+1), x(x+1), 2sen(x)
        esquerda = (x) => a(x) * b(x);
      }
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
      const expoenteEntreParenteses = olhar() === "(";
      const expoente = lerUnario();
      // e^2x pode ser e^(2x) ou (e^2)·x: em vez de adivinhar, pedimos parênteses
      if (!expoenteEntreParenteses && /[a-zA-Z_(]/.test(olhar() || "")) {
        throw new Error('Expoente ambíguo: coloque o expoente entre parênteses. Ex.: e^(2*x) em vez de e^2x, '
          + 'ou e^(x)*sen(x) em vez de e^x sen(x).');
      }
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

    if (c === "|") { // módulo: |x - 3|
      pos++;
      const dentro = lerSoma();
      esperar("|");
      return (x) => Math.abs(dentro(x));
    }

    if (/[a-zA-Z_]/.test(c)) {
      const regex = /[a-zA-Z_][a-zA-Z_0-9]*/y; // letras e dígitos (log2, log10)
      regex.lastIndex = pos;
      const letras = regex.exec(entrada)[0];
      // Pega o MAIOR nome conhecido no começo das letras (permite "xsen(x)", "xe", "pix")
      const nome = NOMES.find((n) => letras.startsWith(n));
      if (!nome) {
        throw new Error(`"${letras}" não é reconhecido. Use x, pi, e e as funções: ${Object.keys(FUNCOES).join(", ")}.`);
      }
      pos += nome.length;

      if (nome === "x") return (x) => x;
      if (tem(CONSTANTES, nome)) { const v = CONSTANTES[nome]; return () => v; }

      const [funcao, quantidade] = FUNCOES[nome];
      // Sem parênteses é ambíguo (sen x² = sen(x²) ou sen(x)²?), então exigimos "sen(x)"
      if (olhar() !== "(") throw new Error(`Escreva ${nome}(...) com parênteses, por exemplo ${nome}(x).`);
      pos++;
      const argumentos = [lerSoma()];
      while (olhar() === ",") { pos++; argumentos.push(lerSoma()); }
      esperar(")");
      if (argumentos.length !== quantidade) {
        throw new Error(`"${nome}" precisa de ${quantidade} argumento(s).`);
      }
      return (x) => funcao(...argumentos.map((arg) => arg(x)));
    }

    throw new Error(`Caractere inesperado "${c}" na função.`);
  }

  const arvore = lerSoma();
  if (pos < entrada.length) {
    throw new Error(`Não entendi "${entrada.slice(pos)}". Confira parênteses e operadores.`);
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

// Avalia um texto que deve virar UM número: aceita 0.5, 0,5, 1/2, pi/2, sqrt(2), 1e-5, 10^-5 e 5x10^-4.
// Devolve NaN se não for um número válido (por exemplo, se usar a variável x).
function avaliarNumero(texto) {
  const limpo = String(texto).trim().replace(/(\d)\s*[xX]\s*10\s*(\^|\*\*)/g, "$1*10^"); // 5x10^-4 → 5*10^-4
  if (limpo === "") return NaN;
  try {
    const valor = compilarFuncao(limpo)(NaN); // se usar "x", o resultado vira NaN e é rejeitado
    return Number.isFinite(valor) ? valor : NaN;
  } catch (erro) {
    return NaN;
  }
}

// Lê um campo de texto como número
function lerNumero(id, nomeDoCampo) {
  const valor = avaliarNumero(pegar(id).value);
  if (!Number.isFinite(valor)) {
    throw new Error(`O campo "${nomeDoCampo}" precisa ser um número (ex.: 2, 0.5, pi/2, 1e-5, 10^-5 ou 5x10^-4).`);
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
   Erro relativo percentual (ER%): 100 · |xₖ − xₖ₋₁| / |xₖ|   (o usado nos slides)
   Critério: "erro" (erro ≤ ε), "fx" (|f(x)| ≤ ε) ou "ambos" (basta um).
   --------------------------------------------------------------------- */

function calcularErro(xNovo, xAnterior, tipo) {
  if (xAnterior === null) return null; // 1ª iteração da bisseção: ainda não há x anterior
  const diferenca = Math.abs(xNovo - xAnterior);
  if (tipo === "relativo" || tipo === "percentual") {
    if (xNovo === 0) return diferenca === 0 ? 0 : Infinity; // evita dividir por zero
    const relativo = diferenca / Math.abs(xNovo);
    return tipo === "percentual" ? 100 * relativo : relativo;
  }
  return diferenca;
}

// Nome da coluna e valor do erro relativo na tabela, conforme o tipo escolhido
const cabecalhoRelativo = (tipo) => (tipo === "percentual" ? "ER (%)" : "Erro relativo");
const erroRelativoTabela = (p, tipo) => textoErro(tipo === "percentual" ? p.erroPct : p.erroRel);

// Quando a raiz é 0, o erro relativo não existe (divide por |x| ≈ 0): explica em vez de só dizer "não convergiu"
function avisoRaizZero(r, tipoErro) {
  if (r.sucesso || tipoErro === "absoluto" || Math.abs(r.raiz) > 1e-8) return "";
  return `<p class="aviso">A raiz parece ser x = 0. Nesse caso o erro relativo não é definido (divide por |x| ≈ 0)
    e nunca fica pequeno. Use o erro absoluto ou o critério |f(x)| ≤ tolerância.</p>`;
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

// Guarda os três tipos de erro de uma iteração (a tabela mostra o absoluto e o relativo/ER%)
const errosDoPasso = (xNovo, xAnterior) => ({
  erroAbs: calcularErro(xNovo, xAnterior, "absoluto"),
  erroRel: calcularErro(xNovo, xAnterior, "relativo"),
  erroPct: calcularErro(xNovo, xAnterior, "percentual"),
});

// Resumo comum: raiz, |f(x)|, nº de iterações e aviso se f(x) ainda está grande
function blocoResultado(r, motivoFalha, extras = []) {
  const titulo = r.sucesso
    ? `<p class="resultado">Raiz aproximada: ${formatar(r.raiz, 8)}</p>`
    : `<p class="erro">${motivoFalha} Melhor aproximação: ${formatar(r.raiz, 8)}</p>`;
  const linhas = [`|f(x)| = ${formatar(Math.abs(r.fx))}`, `${r.passos.length} iteração(ões)`, ...extras];
  let html = titulo + `<p class="aviso">${linhas.join(" · ")}</p>`;
  if (r.sucesso && r.escala !== undefined && Math.abs(r.fx) > 0.5 * r.escala) {
    html += `<p class="erro">Atenção: o erro ficou pequeno, mas |f(x)| continua tão grande quanto nas extremidades. Isso indica descontinuidade
      (ex.: assíntota, como 1/x em x = 0). O Teorema de Bolzano exige f contínua em [a, b]; esse valor NÃO é raiz.</p>`;
  }
  return html;
}

/* ---------------------------------------------------------------------
   3. BISSEÇÃO. Base teórica: Teorema de Bolzano (valor intermediário):
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
  // Compara os SINAIS (e não o produto fa·fb): com valores muito pequenos o produto viraria 0 por arredondamento
  if (Math.sign(fa) === Math.sign(fb)) {
    throw new Error("f(a) e f(b) têm o mesmo sinal: o Teorema de Bolzano não garante raiz em [a, b]. Escolha outro intervalo.");
  }

  const escala = Math.max(Math.abs(fa), Math.abs(fb)); // tamanho típico de |f| no intervalo inicial
  const passos = [];
  let x = a, fx = fa, xAnterior = null;
  let fbAtual = fb;

  for (let iteracao = 1; iteracao <= maxIteracoes; iteracao++) {
    x = (a + b) / 2; // ponto médio
    fx = f(x);
    if (!Number.isFinite(fx)) throw new Error(`f(x) ficou indefinida em x = ${formatar(x)}.`);

    const erro = calcularErro(x, xAnterior, tipoErro);
    passos.push({ iteracao, a, b, fa, fb: fbAtual, x, fx, erro, ...errosDoPasso(x, xAnterior), cota: (b - a) / 2 });

    // Se o ponto médio caiu exatamente na raiz (f(x) = 0), acabou: não há o que refinar
    if (fx === 0 || atendeParada(erro, fx, tolerancia, criterio)) return { sucesso: true, raiz: x, fx, passos, escala };

    // Fica com a metade em que ainda há troca de sinal
    if (Math.sign(fa) !== Math.sign(fx)) { b = x; fbAtual = fx; } else { a = x; fa = fx; }
    xAnterior = x;
  }
  return { sucesso: false, raiz: x, fx, passos, escala };
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
          ["Iteração", "a", "b", "f(a)", "f(b)", "x (ponto médio)", "f(x)", "Erro absoluto", cabecalhoRelativo(tipoErro), "(b−a)/2"],
          r.passos.map((p) => [p.iteracao, formatar(p.a), formatar(p.b), formatar(p.fa), formatar(p.fb), formatar(p.x), formatar(p.fx),
            textoErro(p.erroAbs), erroRelativoTabela(p, tipoErro), formatar(p.cota)])
        )
      : "";
    saida.innerHTML = blocoResultado(r, `Não convergiu em ${maxIteracoes} iterações.`, extras) + avisoRaizZero(r, tipoErro) + tabela;
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
  if (x0 === x1) throw new Error("x₀ e x₁ precisam ser diferentes: a secante precisa de dois pontos distintos.");
  let xAnterior = x0, xAtual = x1;
  let fAnterior = f(xAnterior), fAtual = f(xAtual);
  if (!Number.isFinite(fAnterior) || !Number.isFinite(fAtual)) {
    throw new Error("A função não está definida em um dos valores iniciais.");
  }
  // Um dos chutes já é raiz: não há o que calcular
  if (fAtual === 0) return { sucesso: true, raiz: xAtual, fx: 0, passos: [] };
  if (fAnterior === 0) return { sucesso: true, raiz: xAnterior, fx: 0, passos: [] };

  const escala = Math.max(Math.abs(fAnterior), Math.abs(fAtual));
  // Se |x| passar muito do tamanho dos chutes iniciais, as aproximações estão fugindo: é divergência
  const limiteDivergencia = 1e6 * Math.max(1, Math.abs(x0), Math.abs(x1));
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
    passos.push({ iteracao, xAnterior, xAtual, fAnterior, fAtual, xNovo, fNovo, erro, ...errosDoPasso(xNovo, xAtual) });

    if (!Number.isFinite(xNovo) || !Number.isFinite(fNovo)) {
      return falha("O método divergiu: o próximo ponto saiu do domínio de f ou virou infinito. Tente outros valores iniciais.");
    }
    if (Math.abs(xNovo) > limiteDivergencia) {
      return falha(`O método divergiu: as aproximações estão se afastando (|x| passou de ${formatar(limiteDivergencia)}). Tente valores iniciais mais perto da raiz.`);
    }
    melhor = { x: xNovo, fx: fNovo };
    if (atendeParada(erro, fNovo, tolerancia, criterio)) return { sucesso: true, raiz: xNovo, fx: fNovo, passos, escala };

    xAnterior = xAtual; fAnterior = fAtual; // avança a janela de dois pontos
    xAtual = xNovo; fAtual = fNovo;
  }
  return falha(`Não convergiu em ${maxIteracoes} iterações.`);
}

// Estima a ordem p ≈ ln(eₖ₊₁/eₖ) / ln(eₖ/eₖ₋₁) com os três últimos erros ainda acima do ruído numérico
function estimarOrdem(passos) {
  const erros = passos.map((p) => p.erroAbs).filter((e) => e !== null && Number.isFinite(e) && e > 1e-13);
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

    // A ordem só faz sentido quando o método convergiu
    const ordem = r.sucesso ? estimarOrdem(r.passos) : null;
    const extras = ordem === null ? [] : [`ordem de convergência estimada ≈ ${ordem.toFixed(2)} (teoria: 1,618)`];
    // Mesmas colunas da tabela dos slides: xᵢ₋₁, xᵢ, f(xᵢ₋₁), f(xᵢ), xᵢ₊₁ e o erro
    const tabela = r.passos.length
      ? montarTabela(
          ["i", "xᵢ₋₁", "xᵢ", "f(xᵢ₋₁)", "f(xᵢ)", "xᵢ₊₁", "f(xᵢ₊₁)", "Erro absoluto", cabecalhoRelativo(tipoErro)],
          r.passos.map((p) => [p.iteracao, formatar(p.xAnterior), formatar(p.xAtual), formatar(p.fAnterior), formatar(p.fAtual),
            formatar(p.xNovo), formatar(p.fNovo), textoErro(p.erroAbs), erroRelativoTabela(p, tipoErro)])
        )
      : "";
    saida.innerHTML = blocoResultado(r, r.motivo, extras) + avisoRaizZero(r, tipoErro) + tabela;
  } catch (erro) {
    mostrarErro(saida, erro);
  }
}


/* ---------------------------------------------------------------------
   5. ELIMINAÇÃO DE GAUSS (com ou sem pivoteamento parcial)
   Para cada coluna k:
     a) escolhe o pivô: com pivoteamento parcial, a linha (de k para baixo)
        com maior |valor|; sem pivoteamento, o próprio elemento da diagonal;
     b) troca essa linha com a linha k, se necessário;
     c) zera os valores abaixo do pivô: Lᵢ ← Lᵢ − mᵢₖ·Lₖ, com mᵢₖ = aᵢₖ / aₖₖ.
   No fim, a matriz fica triangular (U) e resolvemos de baixo para cima.
   Os multiplicadores mᵢₖ formam a matriz L (fatoração LU: A = L·U, ou
   P·A = L·U quando há troca de linhas).
   det(A) = (−1)^(nº de trocas) · produto dos pivôs.
   --------------------------------------------------------------------- */

const LIMITE_PASSOS = 10; // acima dessa ordem, o passo a passo é omitido

// Aritmética usada nas contas: precisão total (≈ 16 algarismos), k algarismos significativos
// (como F(10, k, ...) dos slides) ou k casas decimais. Cada operação é arredondada.
function criarArredondamento(modo, k) {
  if (modo === "significativos") {
    return { arred: (v) => (v === 0 || !Number.isFinite(v) ? v : Number(v.toPrecision(k))), unidadeRel: 10 ** (1 - k), unidadeAbs: 0 };
  }
  if (modo === "casas") {
    return { arred: (v) => (Number.isFinite(v) ? Number(v.toFixed(k)) + 0 : v), unidadeRel: 0, unidadeAbs: 10 ** -k };
  }
  return { arred: (v) => v, unidadeRel: 0, unidadeAbs: 0 };
}

// Funciona para matriz quadrada de QUALQUER ordem n. Também classifica o sistema:
// possível e determinado (SPD), possível e indeterminado (SPI) ou impossível (SI).
function eliminarGauss(matrizOriginal, vetorOriginal, opcoes = {}) {
  const { usarPivoteamento = true, aritmetica = { modo: "total", k: 0 }, fmt = (v) => formatar(v) } = opcoes;
  const { arred, unidadeRel, unidadeAbs } = criarArredondamento(aritmetica.modo, aritmetica.k);
  const n = matrizOriginal.length;
  const guardar = n <= LIMITE_PASSOS; // em matrizes grandes não guardamos cada etapa
  const A = matrizOriginal.map((linha) => linha.map(arred));
  const b = vetorOriginal.map(arred);
  const L = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const ordemLinhas = Array.from({ length: n }, (_, i) => i + 1); // para montar P em P·A = L·U
  const passos = [];
  let trocas = 0;
  const pivos = [];

  // Quando é que um número "é zero"? Uma subtração de valores quase iguais deixa uma sobra de arredondamento
  // (ex.: 2,2·10⁻¹⁶). Por isso cada posição guarda o TAMANHO dos números que a geraram (S e Sb), e o valor
  // conta como zero se for minúsculo perto desse tamanho, levando em conta a precisão usada nas contas.
  const S = A.map((linha) => linha.map(Math.abs));
  const Sb = b.map(Math.abs);
  const ehZero = (v, tamanho, relativoTotal) =>
    Math.abs(v) <= Math.max(relativoTotal * tamanho, 2 * unidadeRel * tamanho, 2 * unidadeAbs);
  const pivoZero = (i, j) => ehZero(A[i][j], S[i][j], 1e-12);
  const ladoDireitoZero = (i) => ehZero(b[i], Sb[i], 1e-9);

  const registrar = (titulo, texto) => {
    if (guardar) passos.push({ titulo, texto, A: A.map((l) => [...l]), b: [...b] });
  };
  registrar("Ponto de partida", ["Matriz aumentada [A | b] como foi digitada" + (aritmetica.modo === "total" ? "." : " (já arredondada).")]);

  let linha = 0; // linha onde o próximo pivô vai ficar
  for (let coluna = 0; coluna < n && linha < n; coluna++) {
    // a) escolha do pivô
    let linhaPivo = linha;
    if (usarPivoteamento) {
      for (let i = linha + 1; i < n; i++) {
        if (Math.abs(A[i][coluna]) > Math.abs(A[linhaPivo][coluna])) linhaPivo = i;
      }
    }
    if (pivoZero(linhaPivo, coluna)) {
      // Sem pivoteamento: se há valor não nulo abaixo, só trocando linhas seria possível continuar
      let haValorAbaixo = false;
      for (let i = linha + 1; i < n; i++) if (!pivoZero(i, coluna)) haValorAbaixo = true;
      if (!usarPivoteamento && haValorAbaixo) {
        return { passos, x: null, trocas, posto: linha, det: null, L: null, U: null, ordemLinhas,
          motivo: `Pivô nulo na linha ${linha + 1}, coluna ${coluna + 1}: sem pivoteamento não dá para continuar (seria preciso trocar linhas). Use o pivoteamento parcial.` };
      }
      for (let i = linha; i < n; i++) A[i][coluna] = 0; // eram ≈ 0
      registrar(`Coluna ${coluna + 1}: sem pivô`, ["Todos os valores desta coluna (da linha atual para baixo) são ≈ 0; passamos para a próxima coluna."]);
      continue;
    }
    // b) troca de linhas (os multiplicadores já guardados em L trocam junto)
    if (linhaPivo !== linha) {
      [A[linha], A[linhaPivo]] = [A[linhaPivo], A[linha]];
      [b[linha], b[linhaPivo]] = [b[linhaPivo], b[linha]];
      [S[linha], S[linhaPivo]] = [S[linhaPivo], S[linha]];
      [Sb[linha], Sb[linhaPivo]] = [Sb[linhaPivo], Sb[linha]];
      [ordemLinhas[linha], ordemLinhas[linhaPivo]] = [ordemLinhas[linhaPivo], ordemLinhas[linha]];
      for (let j = 0; j < linha; j++) [L[linha][j], L[linhaPivo][j]] = [L[linhaPivo][j], L[linha][j]];
      trocas++;
      registrar(`Coluna ${coluna + 1}: troca de linhas`, [`Operação: L${linha + 1} ↔ L${linhaPivo + 1}`]);
    }
    // c) elimina os valores abaixo do pivô
    const operacoes = [];
    for (let i = linha + 1; i < n; i++) {
      const fator = arred(A[i][coluna] / A[linha][coluna]);
      L[i][linha] = fator;
      for (let j = coluna + 1; j < n; j++) {
        A[i][j] = arred(A[i][j] - arred(fator * A[linha][j]));
        S[i][j] = Math.max(S[i][j], Math.abs(fator) * S[linha][j]);
      }
      b[i] = arred(b[i] - arred(fator * b[linha]));
      Sb[i] = Math.max(Sb[i], Math.abs(fator) * Sb[linha]);
      A[i][coluna] = 0; // é zero por construção
      if (guardar) operacoes.push(`L${i + 1} ← L${i + 1} − (${fmt(fator)})·L${linha + 1}   [m${i + 1}${linha + 1} = ${fmt(fator)}]`);
    }
    pivos.push(A[linha][coluna]);
    registrar(`Coluna ${coluna + 1}: eliminação`, [`Pivô = ${fmt(A[linha][coluna])}`, ...operacoes]);
    linha++;
  }

  const posto = linha; // número de pivôs encontrados
  const U = A.map((l) => [...l]);
  const det = posto < n ? 0 : (trocas % 2 === 0 ? 1 : -1) * pivos.reduce((produto, p) => produto * p, 1);

  if (posto < n) {
    // Linhas sem pivô: se alguma ficou "0 = c" com c ≠ 0 → impossível; senão → indeterminado
    let impossivel = false;
    for (let i = posto; i < n; i++) if (!ladoDireitoZero(i)) impossivel = true;
    const motivo = impossivel
      ? "Sistema IMPOSSÍVEL (SI): sobrou uma linha do tipo 0 = c com c ≠ 0, então não existe solução."
      : `Sistema POSSÍVEL E INDETERMINADO (SPI): só ${posto} pivô(s) para ${n} incógnitas (det(A) = 0), então há infinitas soluções.`;
    return { passos, x: null, trocas, posto, det, L, U, ordemLinhas, motivo, impossivel };
  }

  // Retrossubstituição: da última linha para a primeira
  const x = new Array(n).fill(0);
  const contas = [];
  for (let i = n - 1; i >= 0; i--) {
    let soma = b[i];
    for (let j = i + 1; j < n; j++) soma = arred(soma - arred(A[i][j] * x[j]));
    x[i] = arred(soma / A[i][i]);
    if (guardar) contas.push(`x${i + 1} = ${fmt(x[i])}`);
  }
  registrar("Retrossubstituição", ["Resolvendo de baixo para cima:", ...contas]);
  return { passos, x, trocas, posto, det, L, U, ordemLinhas, motivo: null };
}

// Lê um elemento da matriz/vetor. Aceita número, fração e expressão: 0.5, 0,5, 1/2, -sqrt(2), pi, 2e-3
// (sem espaços dentro do elemento). Devolve NaN se não for um número válido.
const lerEntrada = (texto) => avaliarNumero(texto);

// Separa os números de uma linha: espaço, ";" ou vírgula separam; vírgula ENTRE dígitos é decimal (0,252)
const separarNumeros = (linha) =>
  linha.trim().replace(/(\d),(\d)/g, "$1.$2").split(/[\s,;]+/).filter((t) => t !== "");

const DICA_SEPARADOR = "Separe os números com espaço (ou ;). Para decimais, use ponto ou vírgula colada: 0.5 ou 0,5.";

// Lê a matriz A: uma linha por linha de texto
function lerMatriz(texto) {
  const linhas = texto.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  if (linhas.length === 0) throw new Error("Digite a matriz A.");
  const matriz = linhas.map((linha) => separarNumeros(linha).map(lerEntrada));

  if (matriz.some((linha) => linha.some((v) => !Number.isFinite(v)))) {
    throw new Error("A matriz A tem algo que não é número. " + DICA_SEPARADOR);
  }
  if (matriz.some((linha) => linha.length !== matriz.length)) {
    throw new Error(`A matriz A precisa ser quadrada: ${matriz.length} linhas exigem ${matriz.length} números em cada linha. ` + DICA_SEPARADOR);
  }
  return matriz;
}

// Lê o vetor b. Vazio = só fatoração LU e determinante (sem sistema para resolver)
function lerVetor(texto, tamanho) {
  const partes = separarNumeros(texto.replace(/\n/g, " "));
  if (partes.length === 0) return null;
  const vetor = partes.map(lerEntrada);
  if (vetor.some((v) => !Number.isFinite(v))) throw new Error("O vetor b tem algo que não é número. " + DICA_SEPARADOR);
  if (vetor.length !== tamanho) throw new Error(`O vetor b precisa ter ${tamanho} elemento(s), mas tem ${vetor.length}. ` + DICA_SEPARADOR);
  return vetor;
}

// Desenha uma matriz como tabela; com b, desenha [A | b] com uma barra antes da última coluna
function matrizHtml(A, b, fmt) {
  const linhas = A.map((linha, i) => {
    const celulas = linha.map((v) => `<td>${fmt(v)}</td>`).join("");
    const extra = b ? `<td class="separador">${fmt(b[i])}</td>` : "";
    return `<tr>${celulas}${extra}</tr>`;
  }).join("");
  return `<div class="rolagem"><table class="matriz"><tbody>${linhas}</tbody></table></div>`;
}

function executarGauss() {
  const saida = pegar("saida-gauss");
  try {
    const A = lerMatriz(pegar("gauss-matriz").value);
    const n = A.length;
    const bLido = lerVetor(pegar("gauss-vetor").value, n);
    const semB = bLido === null;
    const b = semB ? new Array(n).fill(0) : bLido;
    const casas = lerNumero("gauss-casas", "Casas decimais");
    if (!Number.isInteger(casas) || casas < 0 || casas > 10) {
      throw new Error("As casas decimais precisam ser um inteiro entre 0 e 10.");
    }
    const usarPivoteamento = pegar("gauss-pivoteamento").value !== "nenhum";
    const modo = pegar("gauss-aritmetica").value;
    let k = 0;
    if (modo !== "total") {
      k = lerNumero("gauss-digitos", "Algarismos / casas");
      const minimo = modo === "significativos" ? 1 : 0;
      if (!Number.isInteger(k) || k < minimo || k > 15) {
        throw new Error(`O número de ${modo === "significativos" ? "algarismos significativos" : "casas decimais"} precisa ser um inteiro entre ${minimo} e 15.`);
      }
    }

    // Valores que são só sobra de arredondamento (ex.: 2,2·10⁻¹⁶ no lugar de 0) aparecem como 0
    const escala = Math.max(...A.flat().map(Math.abs), ...b.map(Math.abs), 1e-300);
    const fmt = (v) => (Math.abs(v) < 1e-10 * escala ? "0" : formatar(v, casas));
    const r = eliminarGauss(A, b, { usarPivoteamento, aritmetica: { modo, k }, fmt });

    const textoAritmetica = modo === "total" ? "precisão total"
      : modo === "significativos" ? `aritmética com ${k} algarismos significativos` : `aritmética com ${k} casas decimais`;
    const descricao = `Ordem ${n} · ${usarPivoteamento ? "pivoteamento parcial" : "sem pivoteamento"} · ${textoAritmetica} · ${r.trocas} troca(s) de linha`;
    // Determinante com 10 algarismos significativos (casas fixas esconderiam valores como 1/2160 ≈ 0,000463)
    const formatarDet = (v) => (v === 0 ? "0" : String(Number(v.toPrecision(10)))); // det = 0 exato quando há menos de n pivôs
    const textoDet = r.det === null ? "" : ` · det(A) = ${formatarDet(r.det)}`;

    let resumo;
    if (semB) {
      resumo = r.det === null
        ? `<p class="erro">${r.motivo}</p>`
        : `<p class="resultado">det(A) = ${formatarDet(r.det)}</p>
           <p class="aviso">${descricao}. Sem vetor b: mostramos só a eliminação, o determinante e a fatoração LU.</p>`;
    } else if (r.x) {
      // Verificação: maior diferença entre A·x e b (deve ser ≈ 0)
      let maiorDiferenca = 0;
      for (let i = 0; i < n; i++) {
        let soma = 0;
        for (let j = 0; j < n; j++) soma += A[i][j] * r.x[j];
        maiorDiferenca = Math.max(maiorDiferenca, Math.abs(soma - b[i]));
      }
      const solucao = r.x.map((v, i) => `x${i + 1} = ${fmt(v)}`).join(" · ");
      resumo = `<p class="resultado">Sistema possível e determinado (SPD): ${solucao}</p>
        <p class="aviso">${descricao}${textoDet} · maior diferença |A·x − b| = ${formatar(maiorDiferenca)}</p>`;
    } else {
      resumo = `<p class="erro">${r.motivo}</p>` + (r.det === null ? "" : `<p class="aviso">${descricao}${textoDet}</p>`);
    }

    let passosHtml = "";
    if (n <= LIMITE_PASSOS) {
      passosHtml = `<h3>Passo a passo</h3>` + r.passos.map((p) => `
        <article class="passo">
          <h4>${p.titulo}</h4>
          <p>${p.texto.map((t) => (semB ? t.replace("Matriz aumentada [A | b]", "Matriz A") : t)).join("<br>")}</p>
          ${matrizHtml(p.A, semB ? null : p.b, fmt)}
        </article>`).join("");
      if (r.L) {
        const trocou = r.trocas > 0;
        passosHtml += `
        <article class="passo">
          <h4>Fatoração LU ${trocou ? "(P·A = L·U)" : "(A = L·U)"}</h4>
          <p>L guarda os multiplicadores mᵢₖ abaixo da diagonal de 1s; U é a matriz triangular final.
            ${trocou ? `Houve troca de linhas: L·U é igual a A com as linhas na ordem ${r.ordemLinhas.join(", ")} (matriz de permutação P).` : ""}</p>
          <p><strong>L</strong></p>${matrizHtml(r.L, null, fmt)}
          <p><strong>U</strong></p>${matrizHtml(r.U, null, fmt)}
        </article>`;
      }
    } else {
      passosHtml = `<p class="aviso">Matriz ${n}×${n}: os passos e a fatoração LU foram omitidos (limite de ${LIMITE_PASSOS}×${LIMITE_PASSOS}) para a página não travar. O resultado é completo.</p>`;
    }
    saida.innerHTML = resumo + passosHtml;
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

// O campo k só vale quando as contas são arredondadas
const atualizarCampoDigitos = () => { pegar("gauss-digitos").disabled = pegar("gauss-aritmetica").value === "total"; };
pegar("gauss-aritmetica").addEventListener("change", atualizarCampoDigitos);
atualizarCampoDigitos();
