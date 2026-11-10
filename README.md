# Caderno de Métodos Numéricos

Site que resolve problemas de métodos numéricos mostrando o cálculo passo a passo.
Roda inteiro no navegador (HTML, CSS e JavaScript), sem servidor e sem instalar nada.

**Site online:** https://Doug-boy.github.io/TrabalhoAP2/

## Métodos

| Método | O que resolve | O que o site mostra |
|---|---|---|
| **Bisseção** | Raiz de f(x) em [a, b] com f(a)·f(b) < 0 | Tabela com a, b, f(a), f(b), ponto médio, f(x), erros e (b−a)/2; linha de Bolzano; nº de iterações previsto pela teoria, com a conta; contas de cada iteração por extenso; gráfico de f(x) com os pontos médios |
| **Secante** | Raiz de f(x) a partir de dois valores iniciais | Tabela com as colunas dos slides (xᵢ₋₁, xᵢ, f(xᵢ₋₁), f(xᵢ), xᵢ₊₁, f(xᵢ₊₁)) e erros; contas por extenso; ordem de convergência estimada; animação das retas secantes, iteração por iteração |
| **Eliminação de Gauss** (com ou sem pivoteamento parcial) | Sistema A·x = b com A quadrada de **qualquer ordem** | Matriz aumentada em cada etapa (até 10×10), retrossubstituição com os números, solução, verificação, determinante, fatoração LU e solução por LU (L·y = b, U·x = y); resultado em frações exatas; número de condição; contas em precisão total ou arredondadas a k algarismos/casas |
| **Comparar bisseção × secante** | A mesma f nos dois métodos | Iterações, raiz e ordem de cada um, com gráfico do erro por iteração em escala log |

## Erro e critério de parada

Na bisseção e na secante dá para escolher:

- **Erro usado para parar:** (as tabelas sempre mostram dois erros, o absoluto e o relativo) absoluto `|xₖ − xₖ₋₁|`, relativo `|xₖ − xₖ₋₁| / |xₖ|` ou relativo em porcentagem, ER% = `100·|xₖ − xₖ₋₁| / |xₖ|`.

Para seguir o critério dos slides (ER% < ε), escolha "Relativo em % (ER%)" e digite o ε como está no exercício. Com essa opção, a coluna de erro relativo da tabela aparece em %.
- **Parar quando:** erro ≤ tolerância, `|f(x)|` ≤ tolerância, um dos dois, `(b − a)/2 < tolerância` (Burden e Ruggiero, só na bisseção), `b − a < tolerância` (só na bisseção) ou **fazer exatamente N iterações** (para "faça 5 iterações", sem ε).
- **Casas decimais na tabela:** de 0 a 12 (padrão 6). A raiz aparece com 2 casas a mais.

O site avisa quando a tolerância é menor que a precisão do computador (≈ 16 algarismos) e quando o número foi digitado como `5.10^-4` (o ponto é decimal; para "vezes", use `x` ou `*`).

## Casos que o site avisa por que não rodam

Toda falha vem com um quadro **"Por que não rodou?"** dividido em três partes:

- **O que aconteceu:** os números do problema, como f(a) e f(b), a linha que virou 0 = c ou a linha da matriz com erro.
- **Por quê:** a teoria por trás, como Bolzano, a reta horizontal da secante ou Rouché–Capelli.
- **Como resolver:** botões que preenchem um intervalo ou chute sugerido e rodam de novo. As sugestões vêm de uma varredura de f que separa raízes de verdade de assíntotas.

Principais casos:

- Bisseção sem troca de sinal (`x^2` em [−1, 1]): o Teorema de Bolzano não garante raiz.
- Bisseção em função descontínua (`1/x`, `tan(x)`): o erro diminui, mas |f(x)| continua grande.
- Secante com f(xₙ) = f(xₙ₋₁) (divisão por zero), divergência (`atan(x)` com x₀ = 3 e x₁ = 4) ou ponto fora do domínio; também recusa x₀ = x₁.
- Erro relativo quando a raiz é 0: o site explica que o erro relativo não é definido e sugere o absoluto.
- Gauss: sistema impossível, indeterminado, e pivô zero tratado por troca de linhas (sem pivoteamento, o site para e avisa).
- Gauss com números digitados como inteiros, decimais ou frações: o site refaz a conta com **frações exatas** e avisa se o resultado com ≈ 16 algarismos discorda dela (sistema muito mal condicionado, como a Hilbert 10×10 sem pivoteamento).

## Como escrever a função f(x)

| Quer escrever | Digite |
|---|---|
| Polinômios e potências | `x^3 - 2*x - 5`, `x**3`, `x³`, `pow(x, 2)` ou `pow(x; 2)` |
| Multiplicação | `2*x`, `2x`, `3(x+1)`, `(x+1)(x-1)`, `2sen(x)` |
| Seno, cosseno, tangente | `sen(x)` ou `sin(x)`, `cos(x)`, `tg(x)` ou `tan(x)` |
| Secante, cossecante, cotangente | `sec(x)`, `cosec(x)` ou `csc(x)`, `cot(x)` ou `cotg(x)` |
| Inversas | `arcsen(x)`, `arccos(x)`, `arctg(x)` (também `asin`, `acos`, `atan`) |
| Hiperbólicas | `sinh(x)`, `cosh(x)`, `tanh(x)` |
| Exponencial e logaritmos | `exp(x)` ou `e^x`, `ln(x)` (natural), `log(x)` e `log10(x)` (base 10), `log2(x)` |
| Raízes e módulo | `sqrt(x)` ou `raiz(x)`, `cbrt(x)` (cúbica), `abs(x)` ou `\|x\|` |
| Arredondamento e sinal | `floor(x)`, `ceil(x)`, `round(x)`, `sign(x)` |
| Constantes | `pi`, `e` |
| Equação com igual | `x^2 = 3 + x` (o site usa `x^2 - (3 + x) = 0`); também vale `f(x) = ...` e `y = ...` |

Maiúsculas e minúsculas tanto faz. Aceita `×`, `÷`, `−` e o acento `ˆ` no lugar de `^`.

**O site pede parênteses de propósito em dois casos ambíguos:**

- Função sem parênteses: `senx` ou `sen2x` (seria `sen(x)`, `sen(x²)`?). Escreva `sen(x)`.
- Expoente seguido de algo: `e^2x` (seria `e^(2x)` ou `(e^2)·x`?). Escreva `e^(2*x)` ou `(e^2)*x`. Com o expoente entre parênteses, pode continuar: `e^(x)sen(x)`.

Decimal com ponto ou vírgula: `0.5x` ou `0,5x`. Dois números colados (`1.000,5`, `x2`, `(x+1)2`) dão erro de propósito: use `*` para multiplicar.

## Como digitar números (limites, valores iniciais e tolerância)

| Na lista | Digite |
|---|---|
| ε = 10⁻⁵ | `10^-5` ou `1e-5` |
| ε = 5 × 10⁻⁴ | `5x10^-4` ou `5e-4` |
| 0,001 | `0.001` ou `0,001` |
| [0, π/2] | `0` e `pi/2` |
| √2 | `sqrt(2)` |

## Eliminação de Gauss: como digitar

- Uma linha da matriz por linha de texto, números separados por espaço (ou `;`).
- Decimais com ponto ou vírgula colada: `0,252 0,36 0,12`. Frações e expressões funcionam: `1/2`, `-sqrt(2)`, `pi`.
- O vetor b é opcional: vazio, o site mostra só a eliminação, o determinante e a fatoração LU.
- **Aritmética das contas:**
  - Precisão total (≈ 16 algarismos), o padrão.
  - Arredondar a k algarismos significativos, para exercícios em F(10, k, ...).
  - Arredondar a k casas decimais, para "trabalhe com três casas decimais".

  Cada operação é arredondada, como na conta à mão.

## Ferramentas

- **Exemplos prontos:** cada aba tem um menu com as questões da Lista 4, da Lista 6 e dos exemplos dos slides (Cap. 3). Escolher um exemplo preenche os campos, mostra o enunciado e roda.
- **Procurar intervalo (tabela de sinais):** na bisseção e na secante, tabela f(x) de “De” até “Até” com o passo escolhido, destacando onde f troca de sinal (raiz ou assíntota), com gráfico e botão “usar este intervalo”.
- **Gráficos:** passe o mouse (ou o dedo) para ler x e f(x).
- **Matriz em grade:** no Gauss, uma caixinha por número, sempre igual às caixas de texto.
- **Copiar tabela / resultado:** copia no formato do Excel e do Word em português (tabulação e vírgula decimal).
- **Imprimir / salvar PDF:** imprime só a aba aberta, com as contas e os gráficos.
- **Enter** num campo roda o cálculo. Os campos ficam salvos no navegador; “Restaurar os valores padrão”, no rodapé, apaga tudo.

## Exemplos para testar

- **Bisseção e secante:** `x^3 - 2*x - 5`, intervalo `[2, 3]`. Raiz ≈ `2.0945515`.
- **Transcendentais:** `cos(x) - x` em `[0, 1]` (raiz ≈ `0.7390851`); `exp(-x) - x` em `[0, 1]` (≈ `0.5671433`); `ln(x) + x - 2` em `[1, 3]` (≈ `1.5571456`).
- **Secante com ER% (Exemplo 7 dos slides):** `e^(-x) - x`, x₀ = `0`, x₁ = `1`, ε = `10^-2`, erro "Relativo em % (ER%)". São 4 iterações até `0.56714331`, igual à tabela do slide.
- **Gauss:** `A = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]]` e `b = [8, -11, -3]`. Solução `x = [2, 3, -1]`, det(A) = −1.
- **Pivoteamento em F(10, 3):** A = `0.0002 2` / `2 2`, b = `5 6`, aritmética com 3 algarismos significativos. Sem pivoteamento dá x₁ = 0 (errado); com pivoteamento dá x₁ = 0,5.
- **Fatoração LU:** A = `1 1 1` / `2 1 -1` / `3 2 0`, b vazio, sem pivoteamento. L = [[1, 0, 0], [2, 1, 0], [3, 1, 1]], U = [[1, 1, 1], [0, −1, −3], [0, 0, 0]] e det(A) = 0.

## Rodar no seu computador

Abra o arquivo `index.html` no navegador.

## Arquivos

```
index.html   estrutura da página
estilo.css   aparência (inclusive tema escuro e impressão)
app.js       métodos numéricos, frações exatas e ligação com a página
extras.js    gráficos, tabela de sinais, comparar, exemplos prontos, grade, copiar/imprimir
ESTUDO.md    teoria, perguntas prováveis e resumo do código
```
