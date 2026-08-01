# Como resolver o erro de autenticação do Git

O GitHub não aceita mais sua senha pessoal para comandos como `git push`. Siga estes passos:

## 1. Gerar um Token no GitHub
1. Vá para [github.com/settings/tokens](https://github.com/settings/tokens).
2. Clique em **Generate new token** -> **Generate new token (classic)**.
3. Dê um nome (ex: "Terminal Studio").
4. Marque a caixinha **'repo'** (isso é essencial).
5. Role até o fim e clique em **Generate token**.
6. **COPIE o token agora.** Você não conseguirá vê-lo novamente.

## 2. A SOLUÇÃO DEFINITIVA (Sem pedir senha)
Se você está tendo problemas para digitar no terminal (onde a senha fica invisível), use este comando para colocar o token direto no endereço do projeto:

```bash
git remote set-url origin https://SEU_TOKEN_AQUI@github.com/henryzinhosz/ERPFINI.git
```
*(Troque `SEU_TOKEN_AQUI` pelo código que você copiou do GitHub)*

## 3. Resolvendo o erro de "Updates were rejected"
Se você recebeu a mensagem `! [rejected] main -> main (fetch first)`, é porque o GitHub tem arquivos que você não tem localmente. Como queremos um **RECOMEÇO DO ZERO**, use o comando abaixo para forçar o envio:

```bash
git push -u origin main --force
```

---

## 4. Observação importante sobre o Terminal
Quando o terminal pede **Password**, e você digita ou cola, **O CURSOR NÃO SE MOVE E NÃO APARECE NADA**. Isso é um recurso de segurança.
1. Copie seu Token.
2. Quando pedir a senha, cole (Ctrl+V ou botão direito).
3. Aperte **Enter**.

---

## 5. Como iniciar do zero (Reset Total)
1. `rm -rf .git` (Apaga o histórico local)
2. `git init` (Inicia novo repositório)
3. `git remote add origin https://github.com/henryzinhosz/ERPFINI.git` (Reconecta ao GitHub)
4. `git add .` (Prepara os arquivos)
5. `git commit -m "Initial commit"` (Cria o commit inicial)
6. `git push -u origin main --force` (Envia forçado para o GitHub)
