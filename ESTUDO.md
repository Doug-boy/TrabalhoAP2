# Guia de estudo: bisseção, secante e eliminação de Gauss

Todos do grupo precisam saber tudo. Este guia reúne a teoria que costuma ser cobrada e explica o código.
Confira as fórmulas de erro e de parada com o seu caderno/slides da disciplina.

## 1. Teorema principal dos métodos intervalares: Bolzano

**Enunciado:** se f é **contínua** em [a, b] e f(a)·f(b) < 0, então existe pelo menos um c em (a, b) com f(c) = 0.

- É condição **suficiente**, não necessária. `x²` em [−1, 1] tem raiz em 0, mas f(a)·f(b) > 0: o teorema não garante nada e a bisseção recusa o intervalo.
- **Continuidade é obrigatória.** `1/x` em [−1, 2] troca de sinal, mas não tem raiz: tem assíntota. A bisseção converge para 0, mas |f(x)| explode. `tan(x)` em [1, 2] faz o mesmo em π/2.
- Se houver mais de uma raiz no intervalo, o método acha uma delas (não se sabe qual).
- Raiz de multiplicidade par não troca de sinal, então o método intervalar não a enxerga.

## 2. Bisseção

- **Ideia:** ponto médio x = (a+b)/2; fica com a metade em que f troca de sinal.
- **Convergência:** sempre converge (se Bolzano valer). Ordem 1 (linear), razão 1/2: cada iteração ganha 1 bit.
- **Nº de iterações:** n ≥ log₂((b − a)/ε). Ex.: [2, 3], ε = 10⁻⁶ → 20 iterações. Nos testes, o programa bateu exatamente com a fórmula para 14 funções.
- **Prós/contras:** robusta, mas lenta; exige intervalo com troca de sinal; não generaliza para sistemas.

## 3. Secante

- **Fórmula:** xₙ₊₁ = xₙ − f(xₙ)·(xₙ − xₙ₋₁) / (f(xₙ) − f(xₙ₋₁)). É o Newton com a derivada trocada por um quociente de diferenças.
- **Ordem de convergência:** (1+√5)/2 ≈ **1,618** (superlinear), entre a bisseção (1) e o Newton (2). Nos testes, a estimativa ficou entre 1,5 e 1,8.
- **Não exige troca de sinal, mas não tem garantia.** Pode:
  1. dividir por zero se f(xₙ) = f(xₙ₋₁) (ex.: `cos(x)` com x₀ = −1 e x₁ = 1: a função é par);
  2. divergir (ex.: `atan(x)` com x₀ = 3 e x₁ = 4);
  3. sair do domínio (ex.: `ln(x)` com ponto negativo);
  4. nunca convergir se não há raiz real (`x² + 1`);
  5. convergir para uma raiz diferente da esperada.

## 4. Erro e critério de parada

| Tipo | Fórmula |
|---|---|
| Absoluto | \|xₖ − xₖ₋₁\| |
| Relativo | \|xₖ − xₖ₋₁\| / \|xₖ\| (não definido se xₖ = 0) |
| Resíduo | \|f(xₖ)\| |

O programa deixa escolher o tipo de erro e o critério de parada (erro ≤ ε, \|f(x)\| ≤ ε ou um dos dois). Na bisseção, a coluna (b−a)/2 é a **cota** do erro. Erro pequeno **não** garante \|f(x)\| pequeno (caso da assíntota); o programa avisa nesse caso.

## 5. Eliminação de Gauss com pivoteamento parcial

- **Objetivo:** resolver A·x = b (A quadrada n×n) transformando A em triangular superior e depois fazendo **retrossubstituição**.
- **Pivoteamento parcial:** em cada coluna, troca-se a linha para colocar na diagonal o maior valor em módulo. Isso evita dividir por zero (ex.: `[[0,1],[1,0]]`) e reduz a propagação de erros de arredondamento (os fatores ficam com módulo ≤ 1).
- **Custo:** ≈ 2n³/3 operações; a retrossubstituição custa ≈ n².
- **Classificação (pegadinhas):**
  - **SPD**: n pivôs, solução única;
  - **SPI**: menos de n pivôs e nenhuma linha "0 = c" com c ≠ 0; infinitas soluções (det A = 0);
  - **SI**: sobra uma linha "0 = c" com c ≠ 0; sem solução.
- **Mal condicionamento:** o sistema tem solução, mas pequenas perturbações causam grandes erros. Ex.: a matriz de Hilbert 8×8 deu erro de ≈ 4·10⁻⁷ mesmo com pivoteamento. Resíduo pequeno não prova solução precisa.

## 6. Perguntas diretas que podem cair

1. Qual o teorema que garante a raiz nos métodos intervalares? *(Bolzano / valor intermediário.)*
2. Por que a bisseção não rodou em `x²` com [−1, 1]? *(f(a)·f(b) > 0: Bolzano não se aplica, apesar de existir raiz.)*
3. Por que a bisseção "achou" raiz em `1/x`? *(Troca de sinal sem continuidade: é assíntota, não raiz.)*
4. Por que a secante falhou em `cos(x)` com x₀ = −1 e x₁ = 1? *(f(x₀) = f(x₁): denominador zero.)*
5. Qual método converge mais rápido e por quê? *(Secante, ordem ≈ 1,618 contra 1 da bisseção; em troca, sem garantia.)*
6. Quantas iterações a bisseção precisa? *(n ≥ log₂((b−a)/ε).)*
7. Por que usar pivoteamento? *(Evita pivô zero e controla o crescimento dos erros.)*
8. O que significa o sistema não rodar? *(Singular: SPI ou SI. Diferencie os dois.)*
9. Diferença entre erro absoluto e relativo? *(Relativo é dividido pelo módulo do valor; independe da escala.)*

## 7. Resumo do código (`app.js`)

| Parte | O que faz |
|---|---|
| **1. `compilarFuncao`** | Lê o texto de f(x) (ex.: `x^3 - 2*x - 5`, `sin(x)`) com um analisador próprio, sem `eval`. Aceita `^` e `**`, `pi`, `e` e as funções sin, cos, tan, asin, acos, atan, exp, ln, log, sqrt, abs e pow. |
| **2. Utilidades** | `formatar` (casas decimais ou notação científica), `lerNumero`, `lerTolerancia`, `montarTabela`, `mostrarErro`. |
| **3. `calcularErro` / `atendeParada`** | Calculam o erro absoluto ou relativo e decidem quando parar, conforme o critério escolhido. `blocoResultado` monta o resumo e avisa se \|f(x)\| continua grande. |
| **`bissecao`** | Valida o intervalo (Bolzano), calcula o ponto médio, guarda cada passo numa tabela e fica com a metade onde o sinal troca. |
| **4. `secante`** | Aplica a fórmula da secante; detecta divisão por zero, divergência e domínio inválido. `estimarOrdem` estima p ≈ ln(eₖ₊₁/eₖ) / ln(eₖ/eₖ₋₁). |
| **5. `eliminarGauss`** | Pivoteamento parcial, eliminação, retrossubstituição e classificação SPD/SPI/SI. Pivô "zero" é medido em relação ao maior elemento da matriz. Funciona para qualquer ordem n; acima de 10×10 os passos são omitidos para a página não travar. |
| **`lerMatriz` / `lerVetor`** | Convertem o texto digitado e validam que A é quadrada e que b tem n elementos. |
| **6. Ligação com a página** | Abas (mostram um painel por vez) e botões que chamam `executarBissecao`, `executarSecante` e `executarGauss`. |

## 8. Lembretes da apresentação

- Se alguém do grupo **não participou**, o aviso deve ser **oficial, por e-mail, até o dia da apresentação**; essa pessoa fica com 0.
- Perguntas teóricas valem nota; as de programação são mais curiosidade.
- Não vale um colega responder no lugar de quem foi perguntado: todos precisam dominar a teoria.
