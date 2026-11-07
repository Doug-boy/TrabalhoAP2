# Caderno de Métodos Numéricos

Site que resolve problemas de métodos numéricos mostrando o cálculo passo a passo.
Roda inteiro no navegador (HTML, CSS e JavaScript), sem servidor e sem instalar nada.

**Site online:** https://Doug-boy.github.io/TrabalhoAP2/

## Métodos

| Método | O que resolve | O que o site mostra |
|---|---|---|
| **Bisseção** | Raiz de f(x) em [a, b] com f(a)·f(b) < 0 | Tabela com a, b, ponto médio, f(x), erro e (b−a)/2; nº de iterações previsto pela teoria |
| **Secante** | Raiz de f(x) a partir de dois valores iniciais | Tabela com xₙ₋₁, xₙ, xₙ₊₁, f(xₙ₊₁) e erro; ordem de convergência estimada |
| **Eliminação de Gauss** (pivoteamento parcial) | Sistema A·x = b com A quadrada de **qualquer ordem** | Matriz aumentada em cada etapa (até 10×10), solução e verificação |

## Erro e critério de parada

Na bisseção e na secante dá para escolher:

- **Cálculo do erro:** absoluto `|xₖ − xₖ₋₁|` ou relativo `|xₖ − xₖ₋₁| / |xₖ|`.
- **Parar quando:** erro ≤ tolerância, `|f(x)|` ≤ tolerância, ou um dos dois.

## Casos que o site avisa por que não rodam

- Bisseção sem troca de sinal (`x^2` em [−1, 1]): o Teorema de Bolzano não garante raiz.
- Bisseção em função descontínua (`1/x`, `tan(x)`): o erro diminui, mas |f(x)| continua grande.
- Secante com f(xₙ) = f(xₙ₋₁) (divisão por zero), divergência ou ponto fora do domínio.
- Gauss: sistema impossível, indeterminado, e pivô zero tratado por troca de linhas.

## Como escrever a função f(x)

| Quer escrever | Digite |
|---|---|
| x ao cubo menos 2x menos 5 | `x^3 - 2*x - 5` (ou `x**3 - 2*x - 5`) |
| seno, cosseno, tangente | `sin(x)`, `cos(x)`, `tan(x)` |
| arco seno, cosseno e tangente | `asin(x)`, `acos(x)`, `atan(x)` |
| exponencial, log natural, log base 10 | `exp(x)`, `ln(x)`, `log(x)` |
| raiz quadrada, módulo, potência | `sqrt(x)`, `abs(x)`, `pow(x, 2)` |
| constantes | `pi`, `e` |

Use `*` para multiplicar (`2*x`, e não `2x`) e ponto como separador decimal.

## Exemplos para testar

- **Bisseção e secante:** `x^3 - 2*x - 5`, intervalo `[2, 3]`. Raiz ≈ `2.0945515`.
- **Transcendentais:** `cos(x) - x` em `[0, 1]` (raiz ≈ `0.7390851`); `exp(-x) - x` em `[0, 1]` (≈ `0.5671433`); `ln(x) + x - 2` em `[1, 3]` (≈ `1.5571456`).
- **Gauss:** `A = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]]` e `b = [8, -11, -3]`. Solução `x = [2, 3, -1]`.

## Rodar no seu computador

Abra o arquivo `index.html` no navegador.

## Arquivos

```
index.html   estrutura da página
estilo.css   aparência
app.js       métodos numéricos e ligação com a página
ESTUDO.md    teoria, perguntas prováveis e resumo do código
```
