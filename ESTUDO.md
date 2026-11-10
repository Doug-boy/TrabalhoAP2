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
  2. divergir (ex.: `atan(x)` com x₀ = 3 e x₁ = 4: os pontos saltam para ±10⁶ e o programa avisa "o método divergiu");
  3. sair do domínio (ex.: `ln(x)` com ponto negativo);
  4. nunca convergir se não há raiz real (`x² + 1`; com x₀ = 0 e x₁ = 1 o programa para logo por divisão por zero, porque f(−1) = f(1));
  5. convergir para uma raiz diferente da esperada.

## 4. Erro e critério de parada

| Tipo | Fórmula |
|---|---|
| Absoluto | \|xₖ − xₖ₋₁\| |
| Relativo | \|xₖ − xₖ₋₁\| / \|xₖ\| (não definido se xₖ = 0) |
| Relativo percentual (ER%) | 100 · \|xₖ − xₖ₋₁\| / \|xₖ\| |
| Resíduo | \|f(xₖ)\| |

**Atenção ao critério dos slides:** no Exemplo 7 da secante (Cap. 3), a professora para quando **ER% < ε** (erro relativo em porcentagem). Com ε = 10⁻² isso dá 4 iterações; com erro absoluto ou relativo comum daria 3. No programa, escolha "Relativo em % (ER%)" e digite o ε como está no slide. Na Lista 4 de bisseção, o critério absoluto bate com N (ex.: Q4 converge em 10 iterações; com ER% < 10⁻³ não convergiria em 15), então confirmem com a professora qual critério ela quer em cada lista.

O programa deixa escolher o tipo de erro (absoluto, relativo ou ER%) e o critério de parada (também (b − a)/2 < ε, b − a < ε e "N iterações fixas") (erro ≤ ε, \|f(x)\| ≤ ε ou um dos dois). Na bisseção, a coluna (b−a)/2 é a **cota** do erro. Erro pequeno **não** garante \|f(x)\| pequeno (caso da assíntota); o programa avisa nesse caso.

## 5. Eliminação de Gauss com pivoteamento parcial

- **Objetivo:** resolver A·x = b (A quadrada n×n) transformando A em triangular superior e depois fazendo **retrossubstituição**.
- **Pivoteamento parcial:** em cada coluna, troca-se a linha para colocar na diagonal o maior valor em módulo. Isso evita dividir por zero (ex.: `[[0,1],[1,0]]`) e reduz a propagação de erros de arredondamento (os fatores ficam com módulo ≤ 1).
- **Custo:** ≈ 2n³/3 operações; a retrossubstituição custa ≈ n².
- **Determinante:** det(A) = (−1)^(nº de trocas) × produto dos pivôs. Ex.: Lista 6, Q10 → 5 · (−0,2) · 13 = −13.
- **Resolver por LU (Lista 6, Q10):** com A = L·U, resolve-se L·y = b (substituição para frente) e depois U·x = y (retrossubstituição). O site mostra as duas com os números.
- **Número de condição:** cond∞(A) = ‖A‖∞·‖A⁻¹‖∞. Perde-se cerca de log₁₀(cond) algarismos. Hilbert 3×3: 748; Hilbert 4×4: 28.375; Hilbert 8×8: 3,4·10¹⁰.
- **Fatoração LU:** os multiplicadores mᵢₖ formam L (diagonal de 1s) e a matriz final é U, então A = L·U (com trocas, P·A = L·U). Lista 6, Q8: L = [1 0 0; 2 1 0; 3 1 1], U = [1 1 1; 0 −1 −3; 0 0 0].
- **Aritmética de ponto flutuante F(10, k, ...):** cada conta é arredondada para k algarismos. Na Q13 com k = 3, sem pivoteamento sai x₁ = 0 (errado; o multiplicador 10000 "engole" os números) e com pivoteamento sai x₁ = 0,500 (certo).
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
9. Diferença entre erro absoluto e relativo? *(Relativo é dividido pelo módulo do valor; independe da escala. ER% é o relativo vezes 100.)*
10. Como calcular o determinante com o Gauss? *(Produto dos pivôs, trocando o sinal a cada troca de linha.)*
11. Por que a Q13 dá x₁ = 0 sem pivoteamento em F(10, 3)? *(Pivô 0,0002 gera multiplicador 10000; os números da linha 2 se perdem no arredondamento e x₁ sai de 0/0,0002.)*

## 7. Resumo do código (`app.js`)

| Parte | O que faz |
|---|---|
| **1. `compilarFuncao`** | Lê o texto de f(x) (ex.: `x^3 - 2*x - 5`, `sin(x)`) com um analisador próprio, sem `eval`. Aceita `^` e `**`, `x²`/`x³`, vírgula decimal (`0,5x`), multiplicação implícita (`2x`), módulo `\|x\|`, equações com `=`, `pi`, `e` e funções como sen, cos, tg, arcsen, exp, ln, log (base 10), log2, sqrt, abs. Sem parênteses em funções (`senx`) ou expoentes (`e^2x`) é ambíguo, então o programa pede parênteses. |
| **2. Utilidades** | `avaliarNumero` (campos aceitam `pi/2`, `10^-5`, `5x10^-4`, `0,5`), `formatar`, `lerNumero`, `lerTolerancia`, `montarTabela`, `mostrarErro`. |
| **3. `calcularErro` / `atendeParada`** | Calculam o erro absoluto, relativo ou ER% e decidem quando parar, conforme o critério escolhido. `blocoResultado` monta o resumo e avisa se \|f(x)\| continua grande; `avisoRaizZero` explica por que o erro relativo não funciona quando a raiz é 0. |
| **3b. Tela da bisseção e da secante** | `linhaBolzano`, `linhaPrevisao` (n ≥ log₂((b − a)/ε) com a conta), `contasBissecao` e `contasSecante` (cada iteração por extenso), `avisoPrecisao` e o aviso de `5.10^-4`. |
| **3. `bissecao`** | Valida o intervalo (Bolzano, comparando os sinais de f(a) e f(b)), calcula o ponto médio, guarda cada passo (a, b, f(a), f(b), x, f(x), erros) e fica com a metade onde o sinal troca. |
| **4. `secante`** | Aplica a fórmula da secante; recusa x₀ = x₁, aceita chute que já é raiz e detecta divisão por zero, divergência (\|x\| passa de 10⁶ vezes o tamanho dos chutes) e domínio inválido. A tabela tem as mesmas colunas do slide. `estimarOrdem` estima p ≈ ln(eₖ₊₁/eₖ) / ln(eₖ/eₖ₋₁), só quando converge. |
| **5. `eliminarGauss`** | Pivoteamento parcial (ou sem pivoteamento), eliminação, retrossubstituição, classificação SPD/SPI/SI, determinante e fatoração LU. Opcional: arredondar cada conta a k algarismos significativos ou k casas decimais (`criarArredondamento`). Um valor conta como zero quando é minúsculo perto dos números que o geraram, considerando a precisão usada. Funciona para qualquer ordem n; acima de 10×10 os passos são omitidos. |
| **5b. Frações exatas** | `Fracao` (BigInt), `fracaoDeTexto`, `gaussExato` (classificação, det e solução sem arredondamento) e `numeroCondicao`. Se a conta com ≈ 16 algarismos discorda da exata, o site avisa. |
| **`lerMatriz` / `lerVetor`** | Convertem o texto digitado (espaço ou `;` separam; vírgula colada entre dígitos é decimal) e validam que A é quadrada e que b tem n elementos. b vazio = só determinante e LU. |
| **6. Ligação com a página** | Abas (mostram um painel por vez), botões que chamam `executarBissecao`, `executarSecante` e `executarGauss`, e os botões de sugestão dos quadros. |
| **`extras.js`** | Gráficos em SVG (sem biblioteca), tabela de sinais, animação da secante, aba Comparar, exemplos prontos, matriz em grade, copiar, imprimir, Enter e campos salvos. |
| **7. "Por que não rodou?"** | Quando algo falha, o erro carrega os números do problema (`ErroDoMetodo`) e `explicarBissecao`, `explicarSecante` e `explicarGauss` montam o quadro com o que aconteceu, por quê e como resolver. `varrerFuncao` percorre f num intervalo e separa trocas de sinal que são raízes (uma minibisseção leva \|f\| a 0) de assíntotas (\|f\| explode) e de raízes que só encostam no eixo (multiplicidade par). |

## 8. Como digitar as questões no site

| Na lista | No site |
|---|---|
| ε = 10⁻⁵ | `10^-5` ou `1e-5` |
| ε = 5 × 10⁻⁴ | `5x10^-4` ou `5e-4` |
| ER% < ε (slides) | Erro usado para parar: "Relativo em % (ER%)" e ε como está |
| [0, π/2] | `0` e `pi/2` |
| x log x − 1 | `x log(x) - 1` (log = base 10; ln = natural) |
| 2cos x = eˣ/2 | `2cos(x) = e^x/2` |
| Matriz com decimais | `0,252 0,36 0,12` (uma linha por linha) |
| Frações (Hilbert) | `1 1/2 1/3` e b `11/6 13/12 47/60` |
| "três casas decimais" | Aritmética: "Arredondar a k casas decimais", k = 3 |
| F(10, 3, ...) | Aritmética: "Arredondar a k algarismos significativos", k = 3 |
| Determinante / LU | Aparecem no resultado do Gauss; deixe b vazio se a questão não tiver b |
| "Faça 5 iterações" | Parar quando: "Fazer exatamente N iterações", N = 5 |
| Critério do Ruggiero/Burden | Parar quando: "(b − a)/2 < tolerância" |
| Qualquer questão das listas | Menu "Exemplos prontos" de cada aba |

## 9. Lembretes da apresentação

- Se alguém do grupo **não participou**, o aviso deve ser **oficial, por e-mail, até o dia da apresentação**; essa pessoa fica com 0.
- Perguntas teóricas valem nota; as de programação são mais curiosidade.
- Não vale um colega responder no lugar de quem foi perguntado: todos precisam dominar a teoria.
