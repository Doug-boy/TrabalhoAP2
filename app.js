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
        // Multiplicação implícita só antes de letra ou "(": 2x, 3(x+1), x(x+1), 2sen(x).
        // Um número colado em outro (1.000,5 · x2 · (x+1)2) é quase sempre erro de digitação: recusa em vez de adivinhar.
        if (/[\d.]/.test(olhar())) {
          throw new Error(`Dois números colados perto de “${entrada.slice(Math.max(0, pos - 3), pos + 3)}”: use * para multiplicar `
            + "(ex.: 2*3, x*2) e, nos decimais, só uma vírgula ou um ponto (ex.: 1000,5 ou 1000.5).");
        }
        const b = lerPotencia();
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

// Lê a função de um campo; erro de digitação vira ErroDoMetodo para o quadro "Por que não rodou?"
function lerFuncao(id) {
  try {
    return compilarFuncao(pegar(id).value);
  } catch (erro) {
    throw new ErroDoMetodo(erro.message, { codigo: "funcao" });
  }
}

// Monta o quadro "Por que não rodou?" sem nunca atrapalhar o resultado principal
function quadroSeguro(montar) {
  try {
    return montar() || "";
  } catch (erro) {
    console.warn("Não foi possível montar a explicação:", erro);
    return "";
  }
}

// Lê um campo de texto como número
function lerNumero(id, nomeDoCampo) {
  const bruto = pegar(id).value;
  const valor = avaliarNumero(bruto);
  // "5.10^-4": no caderno o ponto às vezes é "vezes", mas aqui o ponto é decimal (5,10 elevado a −4)
  if (/(^|[^\d.])\d{1,3}\.10\s*(\^|\*\*)/.test(bruto)) {
    avisosLeitura.push(`No campo "${nomeDoCampo}" você digitou “${escapar(bruto.trim())}”. O ponto é decimal, então o site leu ${formatar(valor, 6)}.
      Se queria “vezes 10 elevado a”, escreva com x ou *: ${escapar(bruto.trim().replace(/\.10/, "x10"))}.`);
  }
  if (!Number.isFinite(valor)) {
    throw new ErroDoMetodo(`O campo "${nomeDoCampo}" precisa ser um número (ex.: 2, 0.5, pi/2, 1e-5, 10^-5 ou 5x10^-4).`, { codigo: "numero" });
  }
  return valor;
}

function lerTolerancia(id) {
  const tolerancia = lerNumero(id, "Tolerância");
  if (tolerancia <= 0) throw new ErroDoMetodo("A tolerância precisa ser maior que zero.", { codigo: "numero" });
  return tolerancia;
}

function lerMaxIteracoes(id) {
  const maximo = lerNumero(id, "Máximo de iterações");
  if (!Number.isInteger(maximo) || maximo < 1 || maximo > 1000) {
    throw new ErroDoMetodo("O máximo de iterações precisa ser um inteiro entre 1 e 1000.", { codigo: "numero" });
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

// Erro que carrega os números do problema, para o quadro "Por que não rodou?" (seção 7)
class ErroDoMetodo extends Error {
  constructor(mensagem, dados) { super(mensagem); this.dados = dados; }
}

const mostrarErro = (saida, erro, quadro = "") => {
  saida.innerHTML = `<div class="erro">${escapar(erro.message)}</div>` + quadro;
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

// Quando a raiz é 0, o erro relativo não existe (divide por |x| ≈ 0): explica em vez de só dizer "não convergiu"
function avisoRaizZero(r, tipoErro) {
  if (r.sucesso || tipoErro === "absoluto" || Math.abs(r.raiz) > 1e-8) return "";
  return `<p class="aviso">A raiz parece ser x = 0. Nesse caso o erro relativo não é definido (divide por |x| ≈ 0)
    e nunca fica pequeno. Use o erro absoluto ou o critério |f(x)| ≤ tolerância.</p>`;
}

// Critérios: "erro" (erro ≤ ε), "fx" (|f(x)| ≤ ε), "ambos" (basta um), "cota" ((b − a)/2 < ε, da linha),
// "largura" (b − a < ε, da linha) e "fixo" (faz exatamente N iterações, sem olhar a tolerância).
function atendeParada(erro, fx, tolerancia, criterio, cota = null) {
  if (criterio === "fixo") return false;
  if (criterio === "cota") return cota !== null && cota < tolerancia;
  if (criterio === "largura") return cota !== null && 2 * cota < tolerancia;
  const erroOk = erro !== null && erro <= tolerancia;
  const fxOk = Math.abs(fx) <= tolerancia;
  if (criterio === "erro") return erroOk;
  if (criterio === "fx") return fxOk;
  return erroOk || fxOk;
}

const textoErro = (e) => (e === null ? "—" : formatar(e));
const textoErroCasas = (e, casas) => (e === null ? "—" : formatar(e, casas));
const lerOpcoesErro = (p) => ({ tipoErro: pegar(p + "-tipoerro").value, criterio: pegar(p + "-criterio").value });

// Guarda os três tipos de erro de uma iteração (a tabela mostra o absoluto e o relativo/ER%)
const errosDoPasso = (xNovo, xAnterior) => ({
  erroAbs: calcularErro(xNovo, xAnterior, "absoluto"),
  erroRel: calcularErro(xNovo, xAnterior, "relativo"),
  erroPct: calcularErro(xNovo, xAnterior, "percentual"),
});

// Resumo comum: raiz, |f(x)|, nº de iterações e aviso se f(x) ainda está grande
function blocoResultado(r, motivoFalha, extras = [], casas = 6) {
  // A raiz aparece com 2 casas a mais que a tabela (padrão: tabela com 6, raiz com 8)
  const titulo = r.sucesso
    ? `<p class="resultado">Raiz aproximada: ${formatar(r.raiz, casas + 2)}</p>`
    : `<p class="erro">${motivoFalha} Melhor aproximação: ${formatar(r.raiz, casas + 2)}</p>`;
  const linhas = [`|f(x)| = ${formatar(Math.abs(r.fx), casas)}`, `${r.passos.length} iteração(ões)`, ...extras];
  let html = titulo + `<p class="aviso">${linhas.join(" · ")}</p>`;
  if (r.sucesso && r.escala !== undefined && Math.abs(r.fx) > 0.5 * r.escala) {
    html += `<p class="erro">Atenção: o erro ficou pequeno, mas |f(x)| continua tão grande quanto nas extremidades. Isso indica descontinuidade
      (ex.: assíntota, como 1/x em x = 0). O Teorema de Bolzano exige f contínua em [a, b]; esse valor NÃO é raiz.</p>`;
  }
  return html;
}

/* ---------------------------------------------------------------------
   3b. O QUE APARECE NA TELA (bisseção e secante): casas decimais, Bolzano,
   previsão de iterações com a conta, contas de cada iteração por extenso e avisos.
   --------------------------------------------------------------------- */

const SUBSCRITOS = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n) => String(n).split("").map((d) => SUBSCRITOS[Number(d)]).join("");
const EPS_MAQUINA = 2.220446049250313e-16;
// Tolerância e outros números "digitados" aparecem curtos: 0.001, 0.0005, 1e-7 (e não 0.001000)
const compacto = (v) => String(Number(v.toPrecision(6)));

// Avisos sobre o que foi digitado (ex.: "5.10^-4"). São mostrados junto do resultado, sem impedir o cálculo.
let avisosLeitura = [];

function lerCasas(id) {
  const casas = lerNumero(id, "Casas decimais");
  if (!Number.isInteger(casas) || casas < 0 || casas > 12) {
    throw new ErroDoMetodo("As casas decimais precisam ser um inteiro entre 0 e 12.", { codigo: "numero" });
  }
  return casas;
}

const blocoAvisosLeitura = () => avisosLeitura.map((t) => `<p class="aviso">⚠ ${t}</p>`).join("");

// Formatação com as casas escolhidas; negativos entre parênteses quando entram numa conta
const criarFormatos = (casas) => {
  const fmt = (v) => formatar(v, casas);
  const fp = (v) => (v < 0 ? `(${fmt(v)})` : fmt(v));
  return { fmt, fp };
};

function linhaBolzano(r, fmt) {
  if (!r.passos.length) return "";
  const { a, b, fa, fb } = r.passos[0];
  return `<p class="aviso">Bolzano: f(a) = f(${fmt(a)}) = ${fmt(fa)} (${sinalTexto(fa)}) e f(b) = f(${fmt(b)}) = ${fmt(fb)} (${sinalTexto(fb)})
    → f(a)·f(b) < 0 ✓, então existe raiz em [${fmt(a)}, ${fmt(b)}] (se f for contínua).</p>`;
}

// Previsão do número de iterações, com a conta, para o critério escolhido
function linhaPrevisao(r, ctx, fmt) {
  if (!r.passos.length) return "";
  const { tolerancia, tipoErro, criterio, maxIteracoes } = ctx;
  const largura = r.passos[0].b - r.passos[0].a;
  if (criterio === "fixo") return `<p class="aviso">Número de iterações fixo: N = ${maxIteracoes}.</p>`;
  const L = Math.log2(largura / tolerancia);
  const conta = `log₂((b − a)/ε) = log₂(${compacto(largura)}/${compacto(tolerancia)}) = ${L.toFixed(2)}`;
  if (criterio === "erro" && tipoErro === "absoluto") {
    const n = Math.max(2, Math.ceil(L));
    return `<p class="aviso">Previsão pela teoria: |xₖ − xₖ₋₁| = (b − a)/2ᵏ ≤ ε ⇒ k ≥ ${conta} ⇒ <strong>${n} iterações</strong>`
      + `${Math.ceil(L) < 2 ? " (mínimo de 2: a 1ª iteração ainda não tem x anterior para calcular o erro)" : ""}. O site fez ${r.passos.length}.</p>`;
  }
  if (criterio === "cota") {
    const n = Math.max(1, Math.floor(L) + 1);
    return `<p class="aviso">Previsão pela teoria: (b − a)/2ᵏ < ε ⇒ k > ${conta} ⇒ <strong>${n} iterações</strong>. O site fez ${r.passos.length}.</p>`;
  }
  if (criterio === "largura") {
    const n = Math.max(1, Math.floor(L) + 2);
    return `<p class="aviso">Previsão pela teoria: na iteração k o intervalo tem largura (b − a)/2ᵏ⁻¹ < ε ⇒ k − 1 > ${conta} ⇒ <strong>${n} iterações</strong>. O site fez ${r.passos.length}.</p>`;
  }
  if (criterio === "erro" && Math.abs(r.raiz) > 0) {
    const epsAbs = tolerancia * (tipoErro === "percentual" ? 0.01 : 1) * Math.abs(r.raiz);
    const n = Math.max(2, Math.ceil(Math.log2(largura / epsAbs)));
    return `<p class="aviso">Previsão aproximada: o erro relativo depende de |x|. Com |x| ≈ ${fmt(Math.abs(r.raiz))}, ε${tipoErro === "percentual" ? "/100" : ""}·|x| ≈ ${compacto(epsAbs)} ⇒ k ≈ log₂((b − a)/(ε·|x|)) ⇒ <strong>≈ ${n} iterações</strong>. O site fez ${r.passos.length}.</p>`;
  }
  return "";
}

// Avisa quando a tolerância é menor do que o computador consegue distinguir (≈ 16 algarismos)
function avisoPrecisao(r, ctx) {
  const { tolerancia, tipoErro, criterio } = ctx;
  if (criterio === "fx" || criterio === "fixo") return "";
  const x = Math.abs(r.raiz);
  const limite = criterio === "erro" || criterio === "ambos"
    ? (tipoErro === "absoluto" ? 4 * EPS_MAQUINA * x : 4 * EPS_MAQUINA * (tipoErro === "percentual" ? 100 : 1))
    : 4 * EPS_MAQUINA * x;
  if (!(tolerancia < limite)) return "";
  return `<p class="aviso">⚠ A tolerância ${compacto(tolerancia)} é menor que a precisão do computador (≈ 16 algarismos significativos).
    Perto de x ≈ ${formatar(x, 6)}, x para de mudar antes disso: o número de iterações passa a depender do arredondamento, não da teoria.</p>`;
}

function textoMotivoParada(r, ctx, fmt) {
  const { tolerancia, tipoErro, maxIteracoes } = ctx;
  const ultimo = r.passos[r.passos.length - 1];
  const nomeErro = { absoluto: "erro absoluto", relativo: "erro relativo", percentual: "ER%" }[tipoErro];
  const eps = compacto(tolerancia);
  switch (r.motivoParada) {
    case "exata": return `f(x) deu exatamente 0: x é raiz exata.`;
    case "extremo": return `Um dos pontos iniciais já é raiz (f = 0).`;
    case "fixo": return `Fez as N = ${maxIteracoes} iterações pedidas.`;
    case "maquina": return `x parou de mudar (precisão da máquina, ≈ 16 algarismos): as próximas iterações dariam o mesmo valor, então não há como fazer as ${maxIteracoes} pedidas.`;
    case "cota": return `(b − a)/2 = ${fmt(ultimo.cota)} < ε = ${eps}.`;
    case "largura": return `b − a = ${fmt(2 * ultimo.cota)} < ε = ${eps}.`;
    case "fx": return `|f(x)| = ${fmt(Math.abs(r.fx))} ≤ ε = ${eps}.`;
    default: {
      const erroOk = ultimo && ultimo.erro !== null && ultimo.erro <= tolerancia;
      return erroOk ? `${nomeErro} = ${textoErro(ultimo.erro)} ≤ ε = ${eps}.` : `|f(x)| = ${fmt(Math.abs(r.fx))} ≤ ε = ${eps}.`;
    }
  }
}

function linhaErros(p, k, tipoErro, fmt, fp, xNome, xAntNome) {
  if (p.erroAbs === null) return " Erro: ainda não há x anterior.";
  const abs = `|${xNome} − ${xAntNome}| = ${fmt(p.erroAbs)}`;
  const rel = tipoErro === "percentual" ? `ER% = ${fmt(p.erroAbs)}/|${xNome}|·100 = ${textoErro(p.erroPct)}%`
    : `relativo = ${fmt(p.erroAbs)}/|${xNome}| = ${textoErro(p.erroRel)}`;
  return ` Erro absoluto: ${abs}; ${rel}.`;
}

function contasBissecao(r, ctx, casas) {
  if (!r.passos.length) return "";
  const { fmt, fp } = criarFormatos(casas);
  const itens = r.passos.map((p, i) => {
    const k = p.iteracao;
    const xk = `x${sub(k)}`;
    let texto = `<strong>k = ${k}:</strong> ${xk} = (a + b)/2 = (${fp(p.a)} + ${fp(p.b)})/2 = ${fmt(p.x)}; f(${xk}) = ${fmt(p.fx)} (${sinalTexto(p.fx)}).`;
    texto += linhaErros(p, k, ctx.tipoErro, fmt, fp, xk, `x${sub(k - 1)}`);
    if (ctx.criterio === "cota" || ctx.criterio === "largura") texto += ` (b − a)/2 = ${fmt(p.cota)}.`;
    const ultimo = i === r.passos.length - 1;
    if (ultimo && r.sucesso) {
      texto += ` <strong>Para:</strong> ${textoMotivoParada(r, ctx, fmt)}`;
    } else if (p.fx !== 0) {
      texto += Math.sign(p.fa) !== Math.sign(p.fx)
        ? ` f(a)·f(${xk}) < 0 → raiz em [a, ${xk}] → b = ${fmt(p.x)}.`
        : ` f(a)·f(${xk}) > 0 → raiz em [${xk}, b] → a = ${fmt(p.x)}.`;
    }
    return `<li>${texto}</li>`;
  });
  return `<details class="contas"><summary>Contas de cada iteração (como na prova)</summary><ol>${itens.join("")}</ol></details>`;
}

function contasSecante(r, ctx, casas) {
  if (!r.passos.length) return "";
  const { fmt, fp } = criarFormatos(casas);
  const itens = r.passos.map((p, i) => {
    const n = p.iteracao;
    const [xa, xb, xc] = [`x${sub(n - 1)}`, `x${sub(n)}`, `x${sub(n + 1)}`];
    let texto = `<strong>i = ${n}:</strong> ${xc} = ${xb} − f(${xb})·(${xb} − ${xa}) / (f(${xb}) − f(${xa}))`
      + ` = ${fmt(p.xAtual)} − ${fp(p.fAtual)}·(${fmt(p.xAtual)} − ${fp(p.xAnterior)}) / (${fmt(p.fAtual)} − ${fp(p.fAnterior)})`
      + ` = ${fmt(p.xNovo)}; f(${xc}) = ${fmt(p.fNovo)}.`;
    texto += linhaErros(p, n, ctx.tipoErro, fmt, fp, xc, xb);
    if (i === r.passos.length - 1 && r.sucesso) texto += ` <strong>Para:</strong> ${textoMotivoParada(r, ctx, fmt)}`;
    return `<li>${texto}</li>`;
  });
  return `<details class="contas"><summary>Contas de cada iteração (como na prova)</summary><ol>${itens.join("")}</ol></details>`;
}

/* ---------------------------------------------------------------------
   3. BISSEÇÃO. Base teórica: Teorema de Bolzano (valor intermediário):
   se f é contínua em [a, b] e f(a)·f(b) < 0, existe c em (a, b) com f(c) = 0.
   Converge sempre (linear, razão 1/2); iterações: n ≥ log₂((b − a) / ε).
   --------------------------------------------------------------------- */

function bissecao(f, a, b, tolerancia, maxIteracoes, tipoErro = "absoluto", criterio = "erro") {
  if (a > b) [a, b] = [b, a];
  if (a === b) throw new ErroDoMetodo("Os limites a e b precisam ser diferentes.", { codigo: "ab_iguais" });

  let fa = f(a);
  const fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    throw new ErroDoMetodo("A função não está definida em um dos limites do intervalo.", { codigo: "limite_indefinido", a, b, fa, fb });
  }
  if (fa === 0) return { sucesso: true, raiz: a, fx: 0, passos: [], motivoParada: "extremo" };
  if (fb === 0) return { sucesso: true, raiz: b, fx: 0, passos: [], motivoParada: "extremo" };
  // Compara os SINAIS (e não o produto fa·fb): com valores muito pequenos o produto viraria 0 por arredondamento
  if (Math.sign(fa) === Math.sign(fb)) {
    throw new ErroDoMetodo("f(a) e f(b) têm o mesmo sinal: o Teorema de Bolzano não garante raiz em [a, b]. Escolha outro intervalo.", { codigo: "mesmo_sinal", a, b, fa, fb });
  }

  const escala = Math.max(Math.abs(fa), Math.abs(fb)); // tamanho típico de |f| no intervalo inicial
  const passos = [];
  let x = a, fx = fa, xAnterior = null;
  let fbAtual = fb;

  for (let iteracao = 1; iteracao <= maxIteracoes; iteracao++) {
    x = (a + b) / 2; // ponto médio
    fx = f(x);
    if (!Number.isFinite(fx)) throw new ErroDoMetodo(`f(x) ficou indefinida em x = ${formatar(x)}.`, { codigo: "meio_indefinido", x, fx, iteracao });

    const erro = calcularErro(x, xAnterior, tipoErro);
    const cota = (b - a) / 2;
    passos.push({ iteracao, a, b, fa, fb: fbAtual, x, fx, erro, ...errosDoPasso(x, xAnterior), cota });

    // Se o ponto médio caiu exatamente na raiz (f(x) = 0), acabou: não há o que refinar
    if (fx === 0) return { sucesso: true, raiz: x, fx, passos, escala, motivoParada: "exata" };
    const intervaloSeguinte = Math.sign(fa) !== Math.sign(fx) ? [a, x] : [x, b];
    if (atendeParada(erro, fx, tolerancia, criterio, cota)) {
      return { sucesso: true, raiz: x, fx, passos, escala, motivoParada: criterio, intervaloFinal: intervaloSeguinte };
    }

    // Fica com a metade em que ainda há troca de sinal
    if (Math.sign(fa) !== Math.sign(fx)) { b = x; fbAtual = fx; } else { a = x; fa = fx; }
    xAnterior = x;
  }
  if (criterio === "fixo") return { sucesso: true, raiz: x, fx, passos, escala, motivoParada: "fixo", intervaloFinal: [a, b] };
  return { sucesso: false, raiz: x, fx, passos, escala };
}

function executarBissecao() {
  const saida = pegar("saida-bissecao");
  const ctx = {}; // o que já foi lido, para o quadro "Por que não rodou?"
  avisosLeitura = [];
  try {
    const f = lerFuncao("bis-funcao");
    ctx.f = f;
    const a = lerNumero("bis-a", "Limite inferior (a)");
    const b = lerNumero("bis-b", "Limite superior (b)");
    Object.assign(ctx, { a: Math.min(a, b), b: Math.max(a, b) });
    const { tipoErro, criterio } = lerOpcoesErro("bis");
    // Com N fixo a tolerância não é usada (e não precisa estar preenchida)
    const tolerancia = criterio === "fixo" ? 0 : lerTolerancia("bis-tolerancia");
    const maxIteracoes = lerMaxIteracoes("bis-maxiter");
    const casas = lerCasas("bis-casas");
    Object.assign(ctx, { tolerancia, maxIteracoes, tipoErro, criterio, casas });
    const { fmt } = criarFormatos(casas);

    const r = bissecao(f, a, b, tolerancia, maxIteracoes, tipoErro, criterio);

    const tabela = r.passos.length
      ? montarTabela(
          ["Iteração", "a", "b", "f(a)", "f(b)", "x (ponto médio)", "f(x)", "Erro absoluto", cabecalhoRelativo(tipoErro), "(b−a)/2"],
          r.passos.map((p) => [p.iteracao, fmt(p.a), fmt(p.b), fmt(p.fa), fmt(p.fb), fmt(p.x), fmt(p.fx),
            textoErroCasas(p.erroAbs, casas), textoErroCasas(tipoErro === "percentual" ? p.erroPct : p.erroRel, casas), fmt(p.cota)])
        )
      : "";
    const descontinua = r.sucesso && r.escala !== undefined && Math.abs(r.fx) > 0.5 * r.escala;
    const quadro = !r.sucesso ? quadroSeguro(() => explicarNaoConvergiuBissecao(r, ctx))
      : descontinua ? quadroSeguro(() => explicarDescontinuidade(r, ctx)) : "";
    const intervaloFinal = r.sucesso && r.intervaloFinal && (criterio === "cota" || criterio === "largura" || criterio === "fixo")
      ? `<p class="aviso">Intervalo final (depois da última iteração): [${fmt(r.intervaloFinal[0])}, ${fmt(r.intervaloFinal[1])}],
          largura ${fmt(r.intervaloFinal[1] - r.intervaloFinal[0])}. Seu ponto médio é ${fmt((r.intervaloFinal[0] + r.intervaloFinal[1]) / 2)}.</p>`
      : "";
    saida.innerHTML = blocoResultado(r, `Não convergiu em ${maxIteracoes} iterações.`, [], casas)
      + blocoAvisosLeitura() + quadroSeguro(() => avisoPrecisao(r, ctx)) + quadro
      + quadroSeguro(() => linhaBolzano(r, fmt)) + quadroSeguro(() => linhaPrevisao(r, ctx, fmt)) + intervaloFinal
      + tabela + quadroSeguro(() => contasBissecao(r, ctx, casas));
    saida.dispatchEvent(new CustomEvent("resultado", { detail: { metodo: "bissecao", r, ctx } }));
  } catch (erro) {
    mostrarErro(saida, erro, blocoAvisosLeitura() + quadroSeguro(() => explicarBissecao(erro, ctx)));
    saida.dispatchEvent(new CustomEvent("resultado", { detail: { metodo: "bissecao", erro, ctx } }));
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
  if (x0 === x1) throw new ErroDoMetodo("x₀ e x₁ precisam ser diferentes: a secante precisa de dois pontos distintos.", { codigo: "x0x1" });
  let xAnterior = x0, xAtual = x1;
  let fAnterior = f(xAnterior), fAtual = f(xAtual);
  if (!Number.isFinite(fAnterior) || !Number.isFinite(fAtual)) {
    throw new ErroDoMetodo("A função não está definida em um dos valores iniciais.", { codigo: "chute_indefinido", f0: fAnterior, f1: fAtual });
  }
  // Um dos chutes já é raiz: não há o que calcular
  if (fAtual === 0) return { sucesso: true, raiz: xAtual, fx: 0, passos: [], motivoParada: "extremo" };
  if (fAnterior === 0) return { sucesso: true, raiz: xAnterior, fx: 0, passos: [], motivoParada: "extremo" };

  const escala = Math.max(Math.abs(fAnterior), Math.abs(fAtual));
  // Se |x| passar muito do tamanho dos chutes iniciais, as aproximações estão fugindo: é divergência
  const limiteDivergencia = 1e6 * Math.max(1, Math.abs(x0), Math.abs(x1));
  const passos = [];
  let melhor = { x: xAtual, fx: fAtual };
  const falha = (motivo, dados = {}) => ({ sucesso: false, raiz: melhor.x, fx: melhor.fx, passos, motivo, dados });

  for (let iteracao = 1; iteracao <= maxIteracoes; iteracao++) {
    const denominador = fAtual - fAnterior;
    // Com N fixo, depois de convergir x para de mudar e f(xᵢ) = f(xᵢ₋₁): não é falha, é a precisão da máquina
    if (denominador === 0 && criterio === "fixo" && passos.length > 0
        && Math.abs(xAtual - xAnterior) <= 4 * EPS_MAQUINA * Math.max(Math.abs(xAtual), 1e-300)) {
      return { sucesso: true, raiz: xAtual, fx: fAtual, passos, escala, motivoParada: "maquina" };
    }
    if (denominador === 0) {
      return falha("f(xₙ) = f(xₙ₋₁): a reta secante ficou horizontal e não cruza o eixo x (divisão por zero). Tente outros valores iniciais.",
        { codigo: "horizontal", iteracao, xAnterior, xAtual, fAnterior, fAtual });
    }
    const xNovo = xAtual - (fAtual * (xAtual - xAnterior)) / denominador;
    const fNovo = f(xNovo);
    const erro = calcularErro(xNovo, xAtual, tipoErro);
    passos.push({ iteracao, xAnterior, xAtual, fAnterior, fAtual, xNovo, fNovo, erro, ...errosDoPasso(xNovo, xAtual) });

    if (!Number.isFinite(xNovo) || !Number.isFinite(fNovo)) {
      return falha("O método divergiu: o próximo ponto saiu do domínio de f ou virou infinito. Tente outros valores iniciais.",
        { codigo: "dominio", iteracao, xNovo, fNovo, xs: passos.map((q) => q.xNovo) });
    }
    if (Math.abs(xNovo) > limiteDivergencia) {
      return falha(`O método divergiu: as aproximações estão se afastando (|x| passou de ${formatar(limiteDivergencia)}). Tente valores iniciais mais perto da raiz.`,
        { codigo: "divergiu", iteracao, xs: passos.map((q) => q.xNovo) });
    }
    melhor = { x: xNovo, fx: fNovo };
    if (fNovo === 0 && criterio === "fixo") return { sucesso: true, raiz: xNovo, fx: 0, passos, escala, motivoParada: "exata" };
    if (atendeParada(erro, fNovo, tolerancia, criterio)) return { sucesso: true, raiz: xNovo, fx: fNovo, passos, escala, motivoParada: criterio };

    xAnterior = xAtual; fAnterior = fAtual; // avança a janela de dois pontos
    xAtual = xNovo; fAtual = fNovo;
  }
  if (criterio === "fixo") return { sucesso: true, raiz: melhor.x, fx: melhor.fx, passos, escala, motivoParada: "fixo" };
  return falha(`Não convergiu em ${maxIteracoes} iterações.`, { codigo: "nao_convergiu", passos });
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
  const ctx = {};
  avisosLeitura = [];
  try {
    const f = lerFuncao("sec-funcao");
    ctx.f = f;
    const x0 = lerNumero("sec-x0", "Primeiro valor (x₀)");
    const x1 = lerNumero("sec-x1", "Segundo valor (x₁)");
    Object.assign(ctx, { x0, x1 });
    const { tipoErro, criterio } = lerOpcoesErro("sec");
    const tolerancia = criterio === "fixo" ? 0 : lerTolerancia("sec-tolerancia");
    const maxIteracoes = lerMaxIteracoes("sec-maxiter");
    const casas = lerCasas("sec-casas");
    Object.assign(ctx, { tolerancia, maxIteracoes, tipoErro, criterio, casas });
    const { fmt } = criarFormatos(casas);

    const r = secante(f, x0, x1, tolerancia, maxIteracoes, tipoErro, criterio);

    // A ordem só faz sentido quando o método convergiu de verdade (não vale para N fixo)
    const ordem = r.sucesso && criterio !== "fixo" ? estimarOrdem(r.passos) : null;
    const extras = ordem === null ? [] : [`ordem de convergência estimada ≈ ${ordem.toFixed(2)} (teoria: 1,618)`];
    // Mesmas colunas da tabela dos slides: xᵢ₋₁, xᵢ, f(xᵢ₋₁), f(xᵢ), xᵢ₊₁ e o erro
    const tabela = r.passos.length
      ? montarTabela(
          ["i", "xᵢ₋₁", "xᵢ", "f(xᵢ₋₁)", "f(xᵢ)", "xᵢ₊₁", "f(xᵢ₊₁)", "Erro absoluto", cabecalhoRelativo(tipoErro)],
          r.passos.map((p) => [p.iteracao, fmt(p.xAnterior), fmt(p.xAtual), fmt(p.fAnterior), fmt(p.fAtual),
            fmt(p.xNovo), fmt(p.fNovo), textoErroCasas(p.erroAbs, casas), textoErroCasas(tipoErro === "percentual" ? p.erroPct : p.erroRel, casas)])
        )
      : "";
    const quadro = r.sucesso ? "" : (tipoErro !== "absoluto" && avisoRaizZero(r, tipoErro)) || quadroSeguro(() => explicarSecante(r, ctx));
    const linhaN = criterio === "fixo" ? `<p class="aviso">Número de iterações fixo: N = ${maxIteracoes}.</p>` : "";
    saida.innerHTML = blocoResultado(r, r.motivo, extras, casas) + blocoAvisosLeitura()
      + (r.sucesso ? quadroSeguro(() => avisoPrecisao(r, ctx)) : "") + quadro + linhaN + tabela + quadroSeguro(() => contasSecante(r, ctx, casas));
    saida.dispatchEvent(new CustomEvent("resultado", { detail: { metodo: "secante", r, ctx } }));
  } catch (erro) {
    mostrarErro(saida, erro, blocoAvisosLeitura() + quadroSeguro(() => explicarSecante(erro, ctx)));
    saida.dispatchEvent(new CustomEvent("resultado", { detail: { metodo: "secante", erro, ctx } }));
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
  const colunasSemPivo = []; // colunas das variáveis livres (SPI)

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
        let linhaAbaixo = linha + 1;
        while (pivoZero(linhaAbaixo, coluna)) linhaAbaixo++;
        return { passos, x: null, trocas, posto: linha, det: null, L: null, U: null, ordemLinhas,
          detalhe: { codigo: "pivo_nulo", linha, coluna, linhaAbaixo, valorAbaixo: A[linhaAbaixo][coluna] },
          motivo: `Pivô nulo na linha ${linha + 1}, coluna ${coluna + 1}: sem pivoteamento não dá para continuar (seria preciso trocar linhas). Use o pivoteamento parcial.` };
      }
      for (let i = linha; i < n; i++) A[i][coluna] = 0; // eram ≈ 0
      colunasSemPivo.push(coluna);
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
    return { passos, x: null, trocas, posto, det, L, U, ordemLinhas, motivo, impossivel, colunasSemPivo, bFinal: [...b] };
  }

  // Retrossubstituição: da última linha para a primeira
  const x = new Array(n).fill(0);
  const contas = [];
  const fp = (v) => (v < 0 ? `(${fmt(v)})` : fmt(v));
  for (let i = n - 1; i >= 0; i--) {
    let soma = b[i];
    for (let j = i + 1; j < n; j++) soma = arred(soma - arred(A[i][j] * x[j]));
    x[i] = arred(soma / A[i][i]);
    if (guardar) contas.push(textoRetro(i, n, A, b, x, fmt, fp, "x", "b", "u"));
  }
  registrar("Retrossubstituição", ["Resolvendo de baixo para cima (U·x = b da matriz final):", ...contas]);
  return { passos, x, trocas, posto, det, L, U, ordemLinhas, motivo: null, bFinal: [...b] };
}

// Uma linha da retrossubstituição (ou da substituição para frente, na LU) com os números:
// x₂ = (b₂ − u₂₃·x₃)/u₂₂ = (−7 − 3,4·(−2))/(−0,2) = 1
function textoRetro(i, n, M, v, sol, fmt, fp, nomeX, nomeV, nomeM, paraFrente = false, diagonalUm = false) {
  const idx = (k) => sub(k + 1);
  const js = paraFrente ? Array.from({ length: i }, (_, j) => j) : Array.from({ length: n - i - 1 }, (_, k) => i + 1 + k);
  const simbolos = js.map((j) => `${nomeM}${idx(i)}${idx(j)}·${nomeX}${idx(j)}`).join(" − ");
  const numeros = js.map((j) => `${fp(M[i][j])}·${fp(sol[j])}`).join(" − ");
  const divisor = diagonalUm ? "" : `/${nomeM}${idx(i)}${idx(i)}`;
  const divisorNum = diagonalUm ? "" : `/${fp(M[i][i])}`;
  if (!js.length) {
    return diagonalUm
      ? `${nomeX}${idx(i)} = ${nomeV}${idx(i)} = ${fmt(sol[i])}`
      : `${nomeX}${idx(i)} = ${nomeV}${idx(i)}${divisor} = ${fp(v[i])}${divisorNum} = ${fmt(sol[i])}`;
  }
  const abre = diagonalUm ? "" : "(", fecha = diagonalUm ? "" : ")";
  return `${nomeX}${idx(i)} = ${abre}${nomeV}${idx(i)} − ${simbolos}${fecha}${divisor} = ${abre}${fmt(v[i])} − ${numeros}${fecha}${divisorNum} = ${fmt(sol[i])}`;
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
  const textos = linhas.map(separarNumeros);
  const matriz = textos.map((linha) => linha.map(lerEntrada));

  for (let i = 0; i < matriz.length; i++) {
    const j = matriz[i].findIndex((v) => !Number.isFinite(v));
    if (j >= 0) throw new ErroDoMetodo("A matriz A tem algo que não é número. " + DICA_SEPARADOR, { codigo: "matriz_texto", linha: i, coluna: j, texto: textos[i][j] });
  }
  if (matriz.some((linha) => linha.length !== matriz.length)) {
    throw new ErroDoMetodo(`A matriz A precisa ser quadrada: ${matriz.length} linhas exigem ${matriz.length} números em cada linha. ` + DICA_SEPARADOR,
      { codigo: "matriz_tamanho", linhas: matriz.length, contagens: matriz.map((l) => l.length) });
  }
  return matriz;
}

// Lê o vetor b. Vazio = só fatoração LU e determinante (sem sistema para resolver)
function lerVetor(texto, tamanho) {
  const partes = separarNumeros(texto.replace(/\n/g, " "));
  if (partes.length === 0) return null;
  const vetor = partes.map(lerEntrada);
  const ruim = vetor.findIndex((v) => !Number.isFinite(v));
  if (ruim >= 0) throw new ErroDoMetodo("O vetor b tem algo que não é número. " + DICA_SEPARADOR, { codigo: "vetor_texto", coluna: ruim, texto: partes[ruim] });
  if (vetor.length !== tamanho) throw new ErroDoMetodo(`O vetor b precisa ter ${tamanho} elemento(s), mas tem ${vetor.length}. ` + DICA_SEPARADOR,
    { codigo: "vetor_tamanho", n: tamanho, tem: vetor.length });
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

// Refaz o sistema com frações exatas, se tudo que foi digitado for inteiro, decimal ou fração
function calcularExato(textoA, textoB, n, semB, usarPivoteamento) {
  if (n > LIMITE_ORDEM_EXATA) return null;
  const linhas = textoA.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  const Afr = linhas.map((l) => separarNumeros(l).map(fracaoDeTexto));
  if (Afr.some((l) => l.some((q) => q === null))) return null;
  const bfr = semB ? Array.from({ length: n }, () => new Fracao(0n)) : separarNumeros(textoB.replace(/\n/g, " ")).map(fracaoDeTexto);
  if (bfr.some((q) => q === null)) return null;
  try {
    const res = gaussExato(Afr, bfr);
    if (!res) return null;
    const pivoNulo = usarPivoteamento ? null : pivoNuloExato(Afr);
    return { ...res, pivoNulo, classeComMetodo: pivoNulo ? "PIVO" : res.classe };
  } catch (erro) {
    return null;
  }
}

const NOMES_CLASSE = {
  SPD: "possível e determinado (SPD), com solução única",
  SPI: "possível e indeterminado (SPI), com infinitas soluções",
  SI: "impossível (SI), sem solução",
  PIVO: "travado por pivô nulo (sem pivoteamento)",
};

function formatarCond(v) {
  return v < 1e4 ? v.toFixed(1) : v.toExponential(2).replace("e+", "·10^");
}

function executarGauss() {
  const saida = pegar("saida-gauss");
  avisosLeitura = [];
  try {
    const textoA = pegar("gauss-matriz").value;
    const textoB = pegar("gauss-vetor").value;
    const A = lerMatriz(textoA);
    const n = A.length;
    const bLido = lerVetor(textoB, n);
    const semB = bLido === null;
    const b = semB ? new Array(n).fill(0) : bLido;
    const casas = lerNumero("gauss-casas", "Casas decimais");
    if (!Number.isInteger(casas) || casas < 0 || casas > 10) {
      throw new ErroDoMetodo("As casas decimais precisam ser um inteiro entre 0 e 10.", { codigo: "numero" });
    }
    const usarPivoteamento = pegar("gauss-pivoteamento").value !== "nenhum";
    const modo = pegar("gauss-aritmetica").value;
    let k = 0;
    if (modo !== "total") {
      k = lerNumero("gauss-digitos", "Algarismos / casas");
      const minimo = modo === "significativos" ? 1 : 0;
      if (!Number.isInteger(k) || k < minimo || k > 15) {
        throw new ErroDoMetodo(`O número de ${modo === "significativos" ? "algarismos significativos" : "casas decimais"} precisa ser um inteiro entre ${minimo} e 15.`, { codigo: "numero" });
      }
    }

    // Valores que são só sobra de arredondamento (ex.: 2,2·10⁻¹⁶ no lugar de 0) aparecem como 0
    const escala = Math.max(...A.flat().map(Math.abs), ...b.map(Math.abs), 1e-300);
    const fmt = (v) => (Math.abs(v) < 1e-10 * escala ? "0" : formatar(v, casas));
    const fp = (v) => (v < 0 && fmt(v) !== "0" ? `(${fmt(v)})` : fmt(v));
    const { arred } = criarArredondamento(modo, k);
    const r = eliminarGauss(A, b, { usarPivoteamento, aritmetica: { modo, k }, fmt });
    let exato = null;
    try { exato = calcularExato(textoA, textoB, n, semB, usarPivoteamento); } catch (erro) { exato = null; }
    const classeFloat = r.x ? "SPD" : r.detalhe ? "PIVO" : r.impossivel ? "SI" : "SPI";

    const textoAritmetica = modo === "total" ? "precisão total"
      : modo === "significativos" ? `aritmética com ${k} algarismos significativos` : `aritmética com ${k} casas decimais`;
    const descricao = `Ordem ${n} · ${usarPivoteamento ? "pivoteamento parcial" : "sem pivoteamento"} · ${textoAritmetica} · ${r.trocas} troca(s) de linha`;
    // Determinante com 10 algarismos significativos (casas fixas esconderiam valores como 1/2160 ≈ 0,000463)
    const formatarDet = (v) => (v === 0 ? "0" : String(Number(v.toPrecision(10)))); // det = 0 exato quando há menos de n pivôs
    const textoDetExato = exato ? ` (exato: ${textoFracao(exato.det)})` : "";
    const textoDet = r.det === null ? "" : ` · det(A) = ${formatarDet(r.det)}${textoDetExato}`;
    // Número de condição: só faz sentido para matriz invertível
    let cond = null;
    try { cond = (r.x || (exato && exato.classe === "SPD")) && n <= 200 ? numeroCondicao(A) : null; } catch (erro) { cond = null; }
    const textoCond = cond !== null && Number.isFinite(cond) ? ` · cond∞(A) ≈ ${formatarCond(cond)}` : "";

    let resumo;
    if (semB) {
      resumo = r.det === null
        ? `<p class="erro">${r.motivo}</p>`
        : `<p class="resultado">det(A) = ${formatarDet(r.det)}${textoDetExato}</p>
           <p class="aviso">${descricao}${textoCond}. Sem vetor b: mostramos só a eliminação, o determinante e a fatoração LU.</p>`;
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
        <p class="aviso">${descricao}${textoDet}${textoCond} · maior diferença |A·x − b| = ${formatar(maiorDiferenca)}</p>`;
    } else {
      resumo = `<p class="erro">${r.motivo}</p>` + (r.det === null ? "" : `<p class="aviso">${descricao}${textoDet}</p>`);
    }

    // Comparação com a conta exata (frações)
    let caixaExata = "";
    if (exato && !semB) {
      const solucaoExata = exato.x
        ? exato.x.map((q, i) => `x${sub(i + 1)} = ${textoFracao(q)}${q.den === 1n ? "" : ` ≈ ${fmt(q.paraNumero())}`}`).join(" · ")
        : "";
      const classeExata = exato.classeComMetodo;
      if (classeExata === classeFloat) {
        if (exato.x) caixaExata = `<p class="aviso">Em frações (exato, sem arredondamento): ${solucaoExata}</p>`;
      } else if (modo === "total") {
        let explicacao;
        if (classeExata === "SPD") {
          explicacao = `Com frações exatas o sistema é ${NOMES_CLASSE.SPD} (det = ${textoFracao(exato.det)}): ${solucaoExata}.
            Nas contas com ≈ 16 algarismos, um pivô ficou pequeno demais para ser distinguido de zero: é um sistema muito mal condicionado${textoCond ? ` (${textoCond.replace(" · ", "")})` : ""}.`;
        } else if (classeFloat === "SPD") {
          explicacao = `Com frações exatas det(A) = 0 e o sistema é ${NOMES_CLASSE[classeExata]}. A “solução” acima vem só de sobras de arredondamento: não use.`;
        } else if (classeExata === "PIVO") {
          explicacao = `Com frações exatas, sem pivoteamento, o pivô da coluna ${exato.pivoNulo.coluna + 1} é exatamente zero (o método trava ali). Nas contas com ≈ 16 algarismos sobrou um número minúsculo no lugar do zero, e o resultado acima não é confiável.`;
        } else if (classeFloat === "PIVO") {
          explicacao = `Com frações exatas o pivô não é zero, e o sistema é ${NOMES_CLASSE[classeExata]}${solucaoExata ? `: ${solucaoExata}` : ""}. Nas contas com ≈ 16 algarismos ele ficou indistinguível de zero (sistema muito mal condicionado).`;
        } else {
          explicacao = `Com frações exatas o sistema é ${NOMES_CLASSE[classeExata]}, e não ${NOMES_CLASSE[classeFloat]}. A diferença vem do arredondamento das contas.`;
        }
        caixaExata = `<div class="alerta"><strong>Atenção: a conta exata discorda.</strong> ${explicacao}</div>`;
      } else {
        caixaExata = `<div class="alerta"><strong>Comparação com a conta exata (frações):</strong> o sistema é ${NOMES_CLASSE[classeExata]}${solucaoExata ? `: ${solucaoExata}` : ""}.
          Com ${textoAritmetica} o resultado foi diferente: é o efeito do arredondamento que a questão quer mostrar.</div>`;
      }
      if (modo !== "total" && classeExata === classeFloat && exato.x) {
        caixaExata = `<p class="aviso">Conta exata, sem arredondamento (frações), para comparar: ${solucaoExata}</p>`;
      }
    }

    // Sistema mal condicionado
    const caixaCond = cond !== null && Number.isFinite(cond) && cond >= 1e4
      ? `<div class="alerta"><strong>Sistema mal condicionado:</strong> cond∞(A) ≈ ${formatarCond(cond)}. Um erro relativo pequeno nos dados ou nas contas
          pode crescer até ≈ ${formatarCond(cond)} vezes na solução: com ≈ 16 algarismos nas contas, espere perder uns ${Math.round(Math.log10(cond))} deles.</div>`
      : "";

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
        // Resolver por LU: L·y = b (para frente) e U·x = y (para trás)
        if (r.x && !semB) passosHtml += quadroSeguro(() => {
          const c = r.ordemLinhas.map((o) => arred(b[o - 1]));
          const y = new Array(n).fill(0);
          const linhasY = [];
          for (let i = 0; i < n; i++) {
            let soma = c[i];
            for (let j = 0; j < i; j++) soma = arred(soma - arred(r.L[i][j] * y[j]));
            y[i] = soma;
            linhasY.push(textoRetro(i, n, r.L, c, y, fmt, fp, "y", trocou ? "c" : "b", "l", true, true));
          }
          const x = new Array(n).fill(0);
          const linhasX = [];
          for (let i = n - 1; i >= 0; i--) {
            let soma = y[i];
            for (let j = i + 1; j < n; j++) soma = arred(soma - arred(r.U[i][j] * x[j]));
            x[i] = arred(soma / r.U[i][i]);
            linhasX.push(textoRetro(i, n, r.U, y, x, fmt, fp, "x", "y", "u"));
          }
          return `
          <article class="passo">
            <h4>Resolvendo por LU (como na Lista 6, Q10)</h4>
            <p>Como A${trocou ? " (com as linhas trocadas)" : ""} = L·U, o sistema vira dois sistemas triangulares: primeiro L·y = ${trocou ? "c" : "b"}, depois U·x = y.</p>
            ${trocou ? `<p><strong>0) Trocar as linhas de b como em A:</strong> c = P·b = (${c.map(fmt).join("; ")})</p>` : ""}
            <p><strong>1) L·y = ${trocou ? "c" : "b"} (substituição para frente, de cima para baixo):</strong><br>${linhasY.join("<br>")}</p>
            <p>y = (${y.map(fmt).join("; ")})</p>
            <p><strong>2) U·x = y (retrossubstituição, de baixo para cima):</strong><br>${linhasX.join("<br>")}</p>
            <p>x = (${x.map(fmt).join("; ")})</p>
          </article>`;
        });
      }
    } else {
      passosHtml = `<p class="aviso">Matriz ${n}×${n}: os passos e a fatoração LU foram omitidos (limite de ${LIMITE_PASSOS}×${LIMITE_PASSOS}) para a página não travar. O resultado é completo.</p>`;
    }
    // Quadro "Por que não rodou?": pivô nulo sempre; SPI/SI só quando há vetor b (sem b não há sistema para classificar)
    const quadro = !r.x && (r.detalhe || !semB) ? quadroSeguro(() => explicarGauss(r, { A, n, usarPivoteamento, modo })) : "";
    saida.innerHTML = resumo + blocoAvisosLeitura() + caixaExata + caixaCond + quadro + passosHtml;
    saida.dispatchEvent(new CustomEvent("resultado", { detail: { metodo: "gauss", r, exato, cond } }));
  } catch (erro) {
    mostrarErro(saida, erro, blocoAvisosLeitura() + quadroSeguro(() => painelErroDeEntrada(erro)));
  }
}


/* ---------------------------------------------------------------------
   5b. FRAÇÕES EXATAS (para o Gauss)
   Quando todos os números digitados são inteiros, decimais ou frações (0,252 · 1/3 · 2e-3),
   o site refaz o sistema com frações exatas (BigInt). Isso dá:
     • a classificação SPD / SPI / SI sem nenhum arredondamento;
     • a solução e o det(A) em fração, como no gabarito (ex.: det = 1/2160).
   As contas do passo a passo continuam em ponto flutuante: é isso que o método numérico faz.
   --------------------------------------------------------------------- */

const LIMITE_ORDEM_EXATA = 12;   // acima disso as frações crescem demais
const LIMITE_BITS_EXATO = 4000;  // segurança: números gigantes demais → desiste do exato

const mdc = (a, b) => {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
};
const bits = (v) => (v < 0n ? -v : v).toString(2).length;

class Fracao {
  constructor(num, den = 1n) {
    if (den === 0n) throw new Error("denominador zero");
    if (den < 0n) { num = -num; den = -den; }
    const g = mdc(num, den) || 1n;
    this.num = num / g;
    this.den = den / g;
  }
  static de(v) { return v instanceof Fracao ? v : new Fracao(BigInt(v)); }
  mais(o) { return new Fracao(this.num * o.den + o.num * this.den, this.den * o.den); }
  menos(o) { return new Fracao(this.num * o.den - o.num * this.den, this.den * o.den); }
  vezes(o) { return new Fracao(this.num * o.num, this.den * o.den); }
  dividido(o) { return new Fracao(this.num * o.den, this.den * o.num); }
  ehZero() { return this.num === 0n; }
  tamanho() { return Math.max(bits(this.num), bits(this.den)); }
  // Converte para número comum sem estourar, mesmo com numerador e denominador enormes
  paraNumero() {
    if (this.num === 0n) return 0;
    const sinal = this.num < 0n ? -1 : 1;
    const n = this.num < 0n ? -this.num : this.num;
    const e = bits(n) - bits(this.den);
    const desloc = 64 - e;
    const q = desloc >= 0 ? (n << BigInt(desloc)) / this.den : n / (this.den << BigInt(-desloc));
    return sinal * Number(q) * Math.pow(2, -desloc);
  }
  toString() { return this.den === 1n ? this.num.toString() : `${this.num}/${this.den}`; }
}

// "0.252", "-1/3", "2e-3", "+5", "1.5/2" → Fracao; qualquer outra coisa (sqrt(2), pi, 2*3) → null
function fracaoDeTexto(texto) {
  const t = String(texto).trim().replace(/[−–—]/g, "-");
  const parte = "([+-]?)(\\d+\\.?\\d*|\\.\\d+)(?:[eE]([+-]?\\d+))?";
  const m = new RegExp(`^${parte}(?:\\/${parte})?$`).exec(t);
  if (!m) return null;
  const decimal = (sinal, digitos, expoente) => {
    const [inteira, frac = ""] = digitos.split(".");
    let num = BigInt((inteira || "0") + frac);
    let den = 10n ** BigInt(frac.length);
    const e = Number(expoente || 0);
    if (Math.abs(e) > 400) return null;
    if (e > 0) num *= 10n ** BigInt(e); else if (e < 0) den *= 10n ** BigInt(-e);
    if (sinal === "-") num = -num;
    return new Fracao(num, den);
  };
  const a = decimal(m[1], m[2], m[3]);
  if (!a) return null;
  if (m[4] === undefined && m[5] === undefined) return a;
  const b = decimal(m[4], m[5], m[6]);
  if (!b || b.ehZero()) return null;
  return a.dividido(b);
}

// Eliminação exata. Devolve a classificação, o posto, det(A) e (se SPD) a solução, todos exatos.
// Também diz se, SEM pivoteamento, apareceria um pivô exatamente zero com valor não nulo abaixo.
function gaussExato(Afr, bfr) {
  const n = Afr.length;
  const M = Afr.map((linha, i) => [...linha, bfr[i]]);
  let det = new Fracao(1n);
  let linha = 0;
  const colunasPivo = [];
  for (let c = 0; c < n && linha < n; c++) {
    let p = linha;
    while (p < n && M[p][c].ehZero()) p++;
    if (p === n) continue;
    if (p !== linha) { [M[p], M[linha]] = [M[linha], M[p]]; det = new Fracao(-det.num, det.den); }
    det = det.vezes(M[linha][c]);
    for (let i = linha + 1; i < n; i++) {
      if (M[i][c].ehZero()) continue;
      const m = M[i][c].dividido(M[linha][c]);
      for (let j = c; j <= n; j++) {
        M[i][j] = M[i][j].menos(m.vezes(M[linha][j]));
        if (M[i][j].tamanho() > LIMITE_BITS_EXATO) return null;
      }
    }
    colunasPivo.push(c);
    linha++;
  }
  const posto = linha;
  if (posto < n) {
    const impossivel = M.slice(posto).some((l) => !l[n].ehZero());
    return { classe: impossivel ? "SI" : "SPI", posto, det: new Fracao(0n), x: null };
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s = s.menos(M[i][j].vezes(x[j]));
    x[i] = s.dividido(M[i][i]);
  }
  return { classe: "SPD", posto, det, x };
}

// Sem pivoteamento, com frações exatas: em que coluna aparece o primeiro pivô nulo com algo não nulo abaixo?
function pivoNuloExato(Afr) {
  const n = Afr.length;
  const M = Afr.map((l) => [...l]);
  let linha = 0;
  for (let c = 0; c < n && linha < n; c++) {
    if (M[linha][c].ehZero()) {
      if (M.slice(linha + 1).some((l) => !l[c].ehZero())) return { linha, coluna: c };
      continue;
    }
    for (let i = linha + 1; i < n; i++) {
      const m = M[i][c].dividido(M[linha][c]);
      for (let j = c; j < n; j++) M[i][j] = M[i][j].menos(m.vezes(M[linha][j]));
    }
    linha++;
  }
  return null;
}

// Mostra uma fração curta (ou avisa que ela é grande demais para ler)
const textoFracao = (q) => {
  const t = q.toString();
  return t.length <= 30 ? t : `(fração com ${Math.max(q.num.toString().length, q.den.toString().length)} algarismos)`;
};

// Número de condição cond∞(A) = ‖A‖∞·‖A⁻¹‖∞ (A⁻¹ por Gauss–Jordan com pivoteamento parcial, em ponto flutuante)
function numeroCondicao(A) {
  const n = A.length;
  const normaInf = (M) => Math.max(...M.map((l) => l.reduce((s, v) => s + Math.abs(v), 0)));
  const M = A.map((l, i) => [...l, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  const escala = Math.max(...A.flat().map(Math.abs), 1e-300);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i;
    if (Math.abs(M[p][c]) <= 1e-15 * escala) return Infinity;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c];
    for (let j = 0; j < 2 * n; j++) M[c][j] /= piv;
    for (let i = 0; i < n; i++) {
      if (i === c || M[i][c] === 0) continue;
      const m = M[i][c];
      for (let j = 0; j < 2 * n; j++) M[i][j] -= m * M[c][j];
    }
  }
  const inversa = M.map((l) => l.slice(n));
  return normaInf(A) * normaInf(inversa);
}

/* ---------------------------------------------------------------------
   7. "POR QUE NÃO RODOU?"
   Quando algo falha, além da mensagem curta, o site monta um quadro com:
     • O que aconteceu (com os números do problema)
     • Por quê (a teoria por trás)
     • Como resolver (com botões que preenchem um intervalo/chute sugerido e rodam de novo)
   --------------------------------------------------------------------- */

const escapar = (texto) => String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const curto = (v) => (Number.isFinite(v) ? formatar(v, 4) : v === Infinity ? "+∞" : v === -Infinity ? "−∞" : "indefinido");
const sinalTexto = (v) => (v > 0 ? "positivo" : v < 0 ? "negativo" : "zero");

function painelPorQue(titulo, aconteceu, porque, resolver) {
  const bloco = (itens) => (itens.length === 1 ? `<p>${itens[0]}</p>` : `<ul>${itens.map((i) => `<li>${i}</li>`).join("")}</ul>`);
  return `<details class="porque" open>
    <summary>${titulo}</summary>
    <h4>O que aconteceu</h4>${bloco(aconteceu)}
    <h4>Por quê</h4>${bloco(porque)}
    <h4>Como resolver</h4>${bloco(resolver)}
  </details>`;
}

// Botão que preenche campos e roda de novo. "campos" = { idDoCampo: valor }
function botaoSugestao(rotulo, campos, idBotao) {
  return `<button type="button" class="sugestao" data-preencher='${escapar(JSON.stringify(campos))}' data-rodar="${idBotao}">${rotulo}</button>`;
}
const paraCampo = (v) => String(Number(v.toPrecision(8)));

// Troca de sinal entre u e v: raiz ou assíntota? Uma minibisseção decide: perto de uma raiz |f| vai a 0;
// perto de uma assíntota |f| cresce.
function trocaEhRaiz(f, u, v, fu, fv) {
  let a = u, b = v, fa = fu;
  for (let k = 0; k < 60; k++) {
    const m = (a + b) / 2, fm = f(m);
    if (!Number.isFinite(fm)) return false;
    if (fm === 0) return true;
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
  }
  const fFinal = Math.abs(f((a + b) / 2));
  return fFinal <= Math.min(Math.abs(fu), Math.abs(fv)) && fFinal < 1e-6 * Math.max(Math.abs(fu), Math.abs(fv), 1e-300) + 1e-12;
}

// Varre f num intervalo e acha: trocas de sinal que são raízes de verdade, assíntotas (troca de sinal "explodindo"),
// raízes que só encostam no eixo (multiplicidade par) e o ponto onde |f| fica menor.
function varrerFuncao(f, inicio, fim, pontos = 600) {
  const passo = (fim - inicio) / pontos;
  const raizes = [], assintotas = [], toques = [];
  let menor = null, maior = 0;
  const xs = [], fs = [];
  for (let i = 0; i <= pontos; i++) {
    const x = i === pontos ? fim : inicio + i * passo;
    xs.push(x); fs.push(f(x));
  }
  fs.forEach((fx, i) => {
    if (!Number.isFinite(fx)) return;
    maior = Math.max(maior, Math.abs(fx));
    if (menor === null || Math.abs(fx) < Math.abs(menor.fx)) menor = { x: xs[i], fx };
  });
  const ehRaiz = (u, v, fu, fv) => trocaEhRaiz(f, u, v, fu, fv);
  for (let i = 1; i < xs.length; i++) {
    const [u, v, fu, fv] = [xs[i - 1], xs[i], fs[i - 1], fs[i]];
    if (Number.isFinite(fu) !== Number.isFinite(fv)) { assintotas.push({ a: u, b: v, foraDoDominio: true }); continue; }
    if (!Number.isFinite(fu)) continue;
    if (fv === 0) {
      // A varredura caiu exatamente na raiz: olha um pouco para cada lado para saber se f troca de sinal ali
      const esq = f(v - passo / 3), dir = f(v + passo / 3);
      if (Number.isFinite(esq) && Number.isFinite(dir) && Math.sign(esq) !== Math.sign(dir) && esq !== 0 && dir !== 0) {
        raizes.push({ a: v - passo / 3, b: v + passo / 3 });
      } else {
        toques.push({ x: v });
      }
      continue;
    }
    if (fu === 0) continue; // já tratado no passo anterior
    if (Math.sign(fu) !== Math.sign(fv)) (ehRaiz(u, v, fu, fv) ? raizes : assintotas).push({ a: u, b: v });
  }
  return { raizes, assintotas, toques, menor, maior };
}

// Junta trocas de sinal encostadas (mesma raiz achada em dois passos) e ordena pela distância a um ponto
function intervalosSugeridos(varredura, perto, quantos = 4) {
  return varredura.raizes
    .sort((u, v) => Math.abs((u.a + u.b) / 2 - perto) - Math.abs((v.a + v.b) / 2 - perto))
    .slice(0, quantos)
    .sort((u, v) => u.a - v.a);
}

// Procura raízes perto de [a, b]; se não houver nada dentro, olha uma região 10 vezes maior
function procurarPerto(f, a, b) {
  const dentro = varrerFuncao(f, a, b);
  if (dentro.raizes.length) return { varredura: dentro, regiao: [a, b], dentro: true };
  const centro = (a + b) / 2, largura = Math.max(Math.abs(b - a), 1);
  const regiao = [centro - 10 * largura, centro + 10 * largura];
  return { varredura: varrerFuncao(f, regiao[0], regiao[1], 2000), regiao, dentro: false };
}

function textoDominio(valor) {
  return Number.isNaN(valor)
    ? "fica fora do domínio de f (ex.: ln ou log de número ≤ 0, raiz de número negativo, arcsen de algo maior que 1)"
    : "dá infinito (divisão por zero ou assíntota, como em 1/x em x = 0 ou tg(x) em x = π/2)";
}

// ---------------- Bisseção ----------------

function explicarBissecao(erro, ctx) {
  const d = erro.dados || {};
  const { f, a, b } = ctx;
  const sugerirIntervalos = (achado, extra = "") => {
    const lista = intervalosSugeridos(achado.varredura, (a + b) / 2);
    if (!lista.length) {
      return [`Varri f(x) de ${curto(achado.regiao[0])} a ${curto(achado.regiao[1])} e não achei nenhuma troca de sinal. Confira se a função foi digitada certo, ou procure a raiz em outra região.`];
    }
    return [`${achado.dentro ? "Dentro de [a, b]" : `Perto do seu intervalo (de ${curto(achado.regiao[0])} a ${curto(achado.regiao[1])})`}, f troca de sinal em: `
      + lista.map((r) => botaoSugestao(`[${curto(r.a)}; ${curto(r.b)}]`, { "bis-a": paraCampo(r.a), "bis-b": paraCampo(r.b) }, "botao-bissecao")).join(" ")
      + " Clique em um intervalo para usar e rodar de novo." + extra];
  };

  if (d.codigo === "ab_iguais") {
    return painelPorQue("Por que não rodou?", [`Você digitou a = b = ${curto(a)}.`],
      ["A bisseção precisa de um intervalo de verdade: ela divide [a, b] ao meio a cada passo. Com a = b não há intervalo."],
      ["Escolha a < b de forma que f(a) e f(b) tenham sinais opostos."]);
  }
  if (d.codigo === "mesmo_sinal") {
    const doisNeg = d.fa < 0;
    const aconteceu = [`f(a) = f(${curto(d.a)}) = ${curto(d.fa)} (${sinalTexto(d.fa)})`, `f(b) = f(${curto(d.b)}) = ${curto(d.fb)} (${sinalTexto(d.fb)})`,
      `Os dois são ${doisNeg ? "negativos" : "positivos"}, então f(a)·f(b) = ${curto(d.fa * d.fb)} > 0.`];
    const porque = ["O Teorema de Bolzano só garante raiz em [a, b] quando f é contínua e f(a)·f(b) < 0. Com sinais iguais, a bisseção não tem como saber em qual metade a raiz está.",
      "Isso NÃO quer dizer que não existe raiz. Pode não haver nenhuma, pode haver um número par de raízes (f desce e sobe de volta), ou uma raiz dupla em que f encosta no eixo sem trocar de sinal."];
    const achado = procurarPerto(f, d.a, d.b);
    if (achado.dentro) porque.push(`É o caso aqui: dentro de [a, b], f troca de sinal ${achado.varredura.raizes.length} vez(es), ou seja, há um número par de raízes no intervalo e os sinais nas pontas se cancelam.`);
    const varreduraAB = varrerFuncao(f, d.a, d.b);
    const m = varreduraAB.toques.length ? { x: varreduraAB.toques[0].x, fx: 0 } : varreduraAB.menor;
    if (!achado.dentro && m && achado.varredura.maior > 0 && Math.abs(m.fx) < 1e-6 * achado.varredura.maior) {
      porque.push(`f chega a ${curto(m.fx)} perto de x ≈ ${curto(m.x)} sem trocar de sinal: parece uma raiz de multiplicidade par (como em (x − 2)²). Métodos intervalares não enxergam esse tipo de raiz.`);
      return painelPorQue("Por que não rodou?", aconteceu, porque,
        // chutes assimétricos: em raiz dupla, chutes simétricos dão f(x₀) = f(x₁) e a reta fica horizontal
        [`Use a secante com chutes perto de ${curto(m.x)}: ` + botaoSugestao(`x₀ = ${curto(m.x - 0.5)}, x₁ = ${curto(m.x + 0.2)}`,
          { "sec-funcao": pegar("bis-funcao").value, "sec-x0": paraCampo(m.x - 0.5), "sec-x1": paraCampo(m.x + 0.2) }, "botao-secante")]);
    }
    return painelPorQue("Por que não rodou?", aconteceu, porque, sugerirIntervalos(achado));
  }
  if (d.codigo === "limite_indefinido") {
    const ruim = !Number.isFinite(d.fa) ? ["a", d.a, d.fa] : ["b", d.b, d.fb];
    const achado = procurarPerto(f, d.a, d.b);
    return painelPorQue("Por que não rodou?",
      [`f(${ruim[0]}) = f(${curto(ruim[1])}) ${textoDominio(ruim[2])}.`],
      ["A bisseção começa calculando f(a) e f(b) para comparar os sinais. Se f não existe numa ponta, não há o que comparar.",
        "Além disso, o Teorema de Bolzano exige f contínua em todo o intervalo [a, b]."],
      [`Mude ${ruim[0]} para um ponto onde f existe.`, ...sugerirIntervalos(achado)]);
  }
  if (d.codigo === "meio_indefinido") {
    const achado = procurarPerto(f, a, b);
    return painelPorQue("Por que não rodou?",
      [`Na iteração ${d.iteracao}, o ponto médio x = ${curto(d.x)} caiu num lugar onde f ${textoDominio(d.fx)}.`],
      ["Existe uma descontinuidade (ou um trecho fora do domínio) DENTRO de [a, b]. O Teorema de Bolzano exige f contínua em todo o intervalo; sem isso, a troca de sinal pode ser uma assíntota e não uma raiz."],
      sugerirIntervalos(achado, " (os intervalos sugeridos evitam as descontinuidades encontradas)"));
  }
  return painelErroDeEntrada(erro);
}

function explicarNaoConvergiuBissecao(r, ctx) {
  const { a, b, tolerancia, maxIteracoes, tipoErro, criterio } = ctx;
  const ultimo = r.passos[r.passos.length - 1];
  const erroAtual = ultimo ? ultimo.erro : null;
  const nomeErro = { absoluto: "erro absoluto", relativo: "erro relativo", percentual: "ER%" }[tipoErro];
  if (criterio === "cota" || criterio === "largura") {
    const medida = criterio === "cota" ? ultimo.cota : 2 * ultimo.cota;
    const L = Math.log2(Math.abs(b - a) / tolerancia);
    const n = criterio === "cota" ? Math.max(1, Math.floor(L) + 1) : Math.max(1, Math.floor(L) + 2);
    const resolver = n <= 1000
      ? [botaoSugestao(`Rodar com máximo de ${n} iterações`, { "bis-maxiter": String(n) }, "botao-bissecao")]
      : ["Use uma tolerância maior: mesmo 1000 iterações não bastam."];
    if (tolerancia < 4 * EPS_MAQUINA * Math.abs(r.raiz)) resolver.push("A tolerância está abaixo da precisão do computador: o intervalo não consegue ficar tão estreito. Use uma tolerância maior.");
    return painelPorQue("Por que não convergiu?",
      [`Depois de ${maxIteracoes} iterações, ${criterio === "cota" ? "(b − a)/2" : "b − a"} = ${curto(medida)} ainda não é menor que ε = ${curto(tolerancia)}.`,
        `Pela teoria, seriam necessárias ${n} iterações (${criterio === "cota" ? "(b − a)/2ᵏ < ε" : "(b − a)/2ᵏ⁻¹ < ε"}).`],
      ["O intervalo cai pela metade a cada iteração; com N pequeno ele não chega a ficar tão estreito quanto ε."], resolver);
  }
  const aconteceu = [`Depois de ${maxIteracoes} iterações (o máximo que você pediu), o ${criterio === "fx" ? "|f(x)|" : nomeErro} ainda é ${criterio === "fx" ? curto(Math.abs(r.fx)) : textoErro(erroAtual)}, maior que a tolerância ${curto(tolerancia)}.`];
  const porque = ["A bisseção sempre converge, mas devagar: o intervalo cai pela metade a cada passo, então cada iteração ganha só 1 bit (≈ 0,3 casa decimal)."];
  const resolver = [];
  if (tipoErro !== "absoluto" && Math.abs(r.raiz) < 1e-8) {
    porque.push("Aqui há outro motivo: a raiz parece ser x = 0. O erro relativo divide por |x| ≈ 0, então ele nunca fica pequeno, por mais que x se aproxime da raiz.");
    resolver.push(botaoSugestao("Usar erro absoluto", { "bis-tipoerro": "absoluto" }, "botao-bissecao") + " ou o critério |f(x)| ≤ tolerância.");
    return painelPorQue("Por que não convergiu?", aconteceu, porque, resolver);
  }
  // Quantas iterações seriam necessárias: o erro |xₖ − xₖ₋₁| na bisseção vale (b − a)/2ᵏ
  let necessarias = null;
  if (criterio !== "fx") {
    const escalaX = tipoErro === "absoluto" ? 1 : Math.max(Math.abs(r.raiz), 1e-300) * (tipoErro === "percentual" ? 0.01 : 1);
    necessarias = Math.max(2, Math.ceil(Math.log2(Math.abs(b - a) / (tolerancia * escalaX))));
    aconteceu.push(`Pela teoria, |xₖ − xₖ₋₁| = (b − a)/2ᵏ, então para chegar em ${tipoErro === "absoluto" ? "ε" : "ε·|x|"} seriam necessárias cerca de ${necessarias} iterações.`);
  }
  if (necessarias !== null && necessarias <= 1000) {
    resolver.push(botaoSugestao(`Rodar com máximo de ${Math.min(1000, necessarias + 2)} iterações`, { "bis-maxiter": String(Math.min(1000, necessarias + 2)) }, "botao-bissecao"));
  } else {
    resolver.push("Aumente o máximo de iterações ou use uma tolerância maior.");
  }
  if (tolerancia < 1e-15 * Math.max(1, Math.abs(r.raiz))) {
    porque.push(`A tolerância ${curto(tolerancia)} é menor que a precisão do computador (≈ 2·10⁻¹⁶ relativo). Abaixo disso, x para de mudar e o erro não diminui mais.`);
    resolver.push("Use uma tolerância de pelo menos 10⁻¹⁴ vezes o tamanho da raiz.");
  }
  return painelPorQue("Por que não convergiu?", aconteceu, porque, resolver);
}

function explicarDescontinuidade(r, ctx) {
  const { f, a, b } = ctx;
  const achado = procurarPerto(f, a, b);
  const lista = intervalosSugeridos(achado.varredura, (a + b) / 2);
  return painelPorQue("Por que esse valor NÃO é raiz?",
    [`O erro ficou pequeno e o método parou em x ≈ ${curto(r.raiz)}, mas lá |f(x)| = ${curto(Math.abs(r.fx))}, maior do que era nas pontas do intervalo (${curto(r.escala)}).`],
    ["f troca de sinal em [a, b] sem passar por zero: tem uma assíntota (como 1/x em x = 0 ou tg(x) em x = π/2). A bisseção só olha o SINAL, então ela “persegue” a assíntota.",
      "O Teorema de Bolzano exige f contínua em [a, b]. Sem continuidade, troca de sinal não garante raiz."],
    lista.length
      ? [`Intervalos com troca de sinal de verdade (sem assíntota): ` + lista.map((q) => botaoSugestao(`[${curto(q.a)}; ${curto(q.b)}]`, { "bis-a": paraCampo(q.a), "bis-b": paraCampo(q.b) }, "botao-bissecao")).join(" ")]
      : [`Não achei raiz de verdade entre ${curto(achado.regiao[0])} e ${curto(achado.regiao[1])}. Escolha um intervalo que não contenha a assíntota.`]);
}

// ---------------- Secante ----------------

function explicarSecante(erroOuResultado, ctx) {
  const d = erroOuResultado.dados || {};
  const { f, x0, x1, maxIteracoes } = ctx;
  const usarSugestoes = (centro, largura) => {
    const achado = procurarPerto(f, centro - largura, centro + largura);
    const lista = intervalosSugeridos(achado.varredura, centro, 3);
    if (!lista.length) {
      const m = achado.varredura.menor;
      return [`Varri f(x) de ${curto(achado.regiao[0])} a ${curto(achado.regiao[1])} e f nunca troca de sinal${m ? ` (o menor |f| é ${curto(Math.abs(m.fx))}, em x ≈ ${curto(m.x)})` : ""}. Talvez f não tenha raiz real nessa região (ex.: x² + 1 é sempre positiva).`];
    }
    return ["Chutes sugeridos (onde f troca de sinal, perto dos seus): "
      + lista.map((q) => botaoSugestao(`x₀ = ${curto(q.a)}, x₁ = ${curto(q.b)}`, { "sec-x0": paraCampo(q.a), "sec-x1": paraCampo(q.b) }, "botao-secante")).join(" "),
      "Com chutes que cercam a raiz, a secante quase sempre converge. Se quiser garantia, rode a bisseção nesse intervalo."];
  };
  const centro = (x0 + x1) / 2, largura = Math.max(Math.abs(x1 - x0), 1);

  if (d.codigo === "x0x1") {
    return painelPorQue("Por que não rodou?", [`x₀ = x₁ = ${curto(x0)}.`],
      ["A secante traça a reta que passa por (x₀, f(x₀)) e (x₁, f(x₁)). Com um ponto só, não existe reta (a fórmula divide por x₁ − x₀ = 0)."],
      ["Escolha dois valores diferentes, de preferência perto da raiz e um de cada lado dela."]);
  }
  if (d.codigo === "chute_indefinido") {
    const ruim = !Number.isFinite(d.f0) ? ["x₀", x0, d.f0] : ["x₁", x1, d.f1];
    return painelPorQue("Por que não rodou?", [`f(${ruim[0]}) = f(${curto(ruim[1])}) ${textoDominio(ruim[2])}.`],
      ["A secante precisa de f(x₀) e f(x₁) para traçar a primeira reta."], usarSugestoes(centro, largura));
  }
  if (d.codigo === "horizontal") {
    return painelPorQue("Por que não rodou?",
      [`Na iteração ${d.iteracao}, f(xᵢ₋₁) = f(${curto(d.xAnterior)}) = ${curto(d.fAnterior)} e f(xᵢ) = f(${curto(d.xAtual)}) = ${curto(d.fAtual)} são iguais.`,
        "Na fórmula xᵢ₊₁ = xᵢ − f(xᵢ)·(xᵢ − xᵢ₋₁) / (f(xᵢ) − f(xᵢ₋₁)), o denominador vira 0."],
      ["Com f igual nos dois pontos, a reta secante é horizontal e nunca cruza o eixo x: não existe próximo ponto.",
        d.iteracao === 1 ? "Acontece quando os chutes são simétricos numa função par (ex.: cos(x) com x₀ = −1 e x₁ = 1) ou ficam um de cada lado de um máximo/mínimo." :
          "Acontece quando as aproximações caem numa região em que f é quase plana (por exemplo, depois de se afastarem demais da raiz)."],
      usarSugestoes(centro, largura));
  }
  if (d.codigo === "divergiu" || d.codigo === "dominio") {
    const ultimos = d.xs.slice(-4).map(curto).join(" → ");
    return painelPorQue("Por que não convergiu?",
      [d.codigo === "divergiu" ? `As aproximações se afastaram: ${ultimos}.` : `Na iteração ${d.iteracao}, o próximo ponto x = ${curto(d.xNovo)} caiu onde f ${textoDominio(d.fNovo)}.`],
      ["A secante não tem garantia de convergência (diferente da bisseção). Ela usa a inclinação da reta entre os dois últimos pontos; se f é quase plana ali, a reta corta o eixo muito longe e o método “pula” para longe da raiz.",
        "Ela só converge com certeza quando os chutes estão perto o bastante da raiz."],
      usarSugestoes(centro, largura));
  }
  if (d.codigo === "nao_convergiu") {
    const erros = d.passos.map((p) => p.erroAbs).filter((e) => e !== null && Number.isFinite(e));
    const fs = d.passos.map((p) => Math.abs(p.fNovo));
    const razoes = erros.slice(1).map((e, i) => e / erros[i]).filter(Number.isFinite);
    const razaoFinal = razoes.length >= 3 ? razoes.slice(-3).reduce((s, q) => s + q, 0) / 3 : null;
    const aconteceu = [`Depois de ${maxIteracoes} iterações o critério de parada não foi atingido. Últimos x: ${d.passos.slice(-3).map((p) => curto(p.xNovo)).join(" → ")}; último |f(x)| = ${curto(fs[fs.length - 1])}.`];
    if (razaoFinal !== null && razaoFinal > 0.2 && razaoFinal < 0.95 && fs[fs.length - 1] < 1e-3 * Math.max(...fs)) {
      return painelPorQue("Por que não convergiu?", [...aconteceu, `O erro cai sempre pela mesma fração (≈ ${razaoFinal.toFixed(2)} por iteração): convergência LINEAR, e não superlinear (≈ 1,618).`],
        ["Isso é o sinal de uma raiz MÚLTIPLA (f e f′ zeram juntas, como (x − 1)²). Nela, a secante perde a velocidade e fica tão lenta quanto a bisseção."],
        [botaoSugestao("Rodar com máximo de 1000 iterações", { "sec-maxiter": "1000" }, "botao-secante"), "ou aceite uma tolerância maior."]);
    }
    return painelPorQue("Por que não convergiu?", aconteceu,
      ["As aproximações estão oscilando ou andando sem chegar perto de uma raiz. A secante não tem garantia de convergência."],
      [botaoSugestao("Rodar com mais iterações", { "sec-maxiter": String(Math.min(1000, maxIteracoes * 4)) }, "botao-secante"), ...usarSugestoes(centro, largura)]);
  }
  return painelErroDeEntrada(erroOuResultado);
}

// ---------------- Gauss ----------------

const nomeX = (j) => `x${j + 1}`;
function equacaoTexto(linha, valorB) {
  const termos = linha.map((v, j) => `${curto(v)}·${nomeX(j)}`).join(" + ").replace(/\+ -/g, "− ");
  return `${termos} = ${curto(valorB)}`;
}

function explicarGauss(r, ctx) {
  const { A, n, usarPivoteamento, modo } = ctx;
  const d = r.detalhe || {};
  if (d.codigo === "pivo_nulo") {
    return painelPorQue("Por que não rodou?",
      [`Ao chegar na coluna ${d.coluna + 1}, o pivô (linha ${d.linha + 1}, coluna ${d.coluna + 1}) vale 0.`,
        `Mas a linha ${d.linhaAbaixo + 1} tem ${curto(d.valorAbaixo)} nessa coluna, ou seja, um valor não nulo abaixo do pivô.`],
      [`Sem pivoteamento, o método usa sempre o elemento da diagonal como pivô e divide por ele para achar os multiplicadores mᵢₖ = aᵢₖ / aₖₖ. Com aₖₖ = 0, isso é divisão por zero.`,
        "O sistema pode muito bem ter solução: o problema é só a ORDEM das equações. Trocar duas linhas não muda a solução."],
      [botaoSugestao("Rodar com pivoteamento parcial", { "gauss-pivoteamento": "parcial" }, "botao-gauss")
        + ` ou troque a linha ${d.linha + 1} com a linha ${d.linhaAbaixo + 1} no texto da matriz.`]);
  }
  if (r.motivo && !r.x && r.posto < n) {
    const linhasZeradas = [];
    for (let i = r.posto; i < n; i++) linhasZeradas.push(i);
    const livres = (r.colunasSemPivo || []).map(nomeX);
    const avisoArred = modo !== "total"
      ? ` Atenção: com contas arredondadas, um resto que seria exatamente 0 pode sobrar como um número pequeno (e vice-versa). Confira em ${botaoSugestao("precisão total", { "gauss-aritmetica": "total" }, "botao-gauss")}.`
      : "";
    if (r.impossivel) {
      const ruins = linhasZeradas.filter((i) => Math.abs(r.bFinal[i]) > 0).slice(0, 3);
      return painelPorQue("Por que não tem solução?",
        [`A eliminação zerou toda a parte de A na(s) linha(s) ${linhasZeradas.map((i) => i + 1).join(", ")}, mas o lado direito não zerou:`,
          ...ruins.map((i) => `linha ${i + 1}: ${equacaoTexto(r.U[i], r.bFinal[i])}, ou seja, 0 = ${curto(r.bFinal[i])}, o que é impossível.`)],
        [`Uma equação de A virou combinação das outras (det(A) = 0, posto(A) = ${r.posto} < ${n}), mas o b não acompanhou essa combinação. Pelo teorema de Rouché–Capelli, posto(A) = ${r.posto} < posto([A|b]) = ${r.posto + 1}: sistema impossível (SI).`,
          "Geometricamente: as retas/planos não têm um ponto em comum (por exemplo, dois planos paralelos)."],
        ["Não há o que corrigir no método: esse sistema não tem solução. Se esperava solução, confira se A e b foram digitados certo." + avisoArred]);
    }
    return painelPorQue("Por que não tem solução única?",
      [`A eliminação zerou a(s) linha(s) ${linhasZeradas.map((i) => i + 1).join(", ")} inteira(s), inclusive o lado direito: sobrou 0 = 0.`,
        `Só ${r.posto} pivô(s) para ${n} incógnitas${livres.length ? `; não houve pivô na(s) coluna(s) de ${livres.join(", ")}` : ""}.`],
      [`Uma equação é combinação das outras e não traz informação nova (det(A) = 0). Sobram menos equações que incógnitas: posto(A) = posto([A|b]) = ${r.posto} < ${n}, sistema possível e indeterminado (SPI).`,
        `Há infinitas soluções: ${livres.length ? livres.join(", ") : `${n - r.posto} variável(is)`} pode(m) assumir qualquer valor, e as outras ficam em função dela(s).`],
      ["Não é erro: a resposta da questão é “infinitas soluções”. Se esperava solução única, confira se não repetiu uma equação." + avisoArred]);
  }
  return "";
}

// Erros de digitação (função, números, matriz): explica com exemplos de como escrever
function painelErroDeEntrada(erro) {
  const d = erro.dados || {};
  if (d.codigo === "matriz_tamanho") {
    return painelPorQue("Por que não rodou?",
      [`A matriz tem ${d.linhas} linha(s), mas as linhas têm quantidades diferentes de números:`,
        ...d.contagens.map((c, i) => `linha ${i + 1}: ${c} número(s)${c !== d.linhas ? " ← deveria ter " + d.linhas : ""}`)],
      ["A eliminação de Gauss resolve sistemas com o mesmo número de equações e incógnitas: A precisa ser quadrada (n × n)."],
      ["Uma linha da matriz por linha de texto, com os números separados por espaço. Decimal com ponto (0.5) ou vírgula colada (0,5). Um espaço dentro de um número (ex.: “1 / 2”) conta como dois números: escreva 1/2."]);
  }
  if (d.codigo === "matriz_texto" || d.codigo === "vetor_texto") {
    return painelPorQue("Por que não rodou?",
      [`${d.codigo === "matriz_texto" ? `Na linha ${d.linha + 1}, posição ${d.coluna + 1}` : `Na posição ${d.coluna + 1} do vetor b`}, o site leu “${escapar(d.texto)}”, que não é um número.`],
      ["Cada elemento precisa ser um número: inteiro, decimal, fração (1/2) ou expressão sem espaços (sqrt(2), pi/4)."],
      ["Confira se não há letra, x, vírgula separando números (use espaço) ou espaço dentro de uma fração."]);
  }
  if (d.codigo === "vetor_tamanho") {
    return painelPorQue("Por que não rodou?", [`A matriz é ${d.n}×${d.n}, mas o vetor b tem ${d.tem} número(s).`],
      ["O vetor b é o lado direito das equações: precisa de um número por equação (linha de A)."],
      [`Digite ${d.n} números em b, separados por espaço, ou deixe b vazio para ver só o determinante e a LU.`]);
  }
  if (d.codigo === "funcao") {
    return painelPorQue("Por que não rodou?", [`O site não conseguiu ler a função: ${escapar(erro.message)}`],
      ["O site lê a função como uma expressão matemática e recusa o que é ambíguo (como senx ou e^2x) para não calcular uma coisa diferente do que você quis."],
      ["Exemplos que funcionam: x^3 - 2x - 5 · e^(-x) - x · sen(x) - x^2 · x log(x) - 1 · 2cos(x) = e^x/2 · sqrt(x) - cos(x) · |x - 3| - 1"]);
  }
  if (d.codigo === "numero") {
    return painelPorQue("Por que não rodou?", [escapar(erro.message)],
      ["Os campos numéricos aceitam número ou expressão sem a letra x."],
      ["Exemplos: 2 · 0.5 · 0,5 · pi/2 · sqrt(2) · 1e-5 · 10^-5 · 5x10^-4 · 5*10^-4. Para “vezes”, use * ou x (o ponto é decimal)."]);
  }
  return "";
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

// Botões dos quadros "Por que não rodou?": preenchem os campos sugeridos, abrem a aba certa e rodam de novo
document.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".sugestao");
  if (!botao) return;
  const campos = JSON.parse(botao.dataset.preencher || "{}");
  Object.entries(campos).forEach(([id, valor]) => {
    const campo = pegar(id);
    if (campo) {
      campo.value = valor;
      campo.dispatchEvent(new Event("change"));
    }
  });
  const rodar = pegar(botao.dataset.rodar);
  if (rodar) {
    ativarAba(rodar.closest(".painel").id);
    rodar.click();
    rodar.closest(".painel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

// O campo k só vale quando as contas são arredondadas
const atualizarCampoDigitos = () => { pegar("gauss-digitos").disabled = pegar("gauss-aritmetica").value === "total"; };
pegar("gauss-aritmetica").addEventListener("change", atualizarCampoDigitos);
atualizarCampoDigitos();
