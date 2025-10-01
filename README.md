# Prontuário Médico - Sistema de Gerenciamento

Este é um sistema de gerenciamento de prontuários médicos full-stack, projetado para permitir que médicos gerenciem informações de pacientes, prescrições e procedimentos de forma eficiente e segura.

## Tecnologias Utilizadas

O projeto é construído com uma arquitetura moderna e containerizada, utilizando as seguintes tecnologias:

### Backend
*   **Linguagem:** Python
*   **Framework:** Django & Django REST Framework
*   **Banco de Dados:** PostgreSQL
*   **Autenticação:** Autenticação baseada em Token.
*   **APIs Externas:**
    *   **ViaCEP:** Para auto-completar endereços a partir do CEP.
    *   **Nominatim (OpenStreetMap):** Para geolocalização e exibição de endereços em mapas.
*   **Geração de PDF:** `reportlab` para criar versões em PDF de prescrições e procedimentos.

### Frontend
*   **Linguagem:** JavaScript
*   **Framework:** React.js (utilizando Vite)
*   **UI/Componentes:** Material-UI (`@mui/material`)
*   **Roteamento:** React Router
*   **Cliente HTTP:** Axios
*   **Mapas:** Leaflet & React-Leaflet
*   **Notificações:** `notistack`

### Infraestrutura
*   **Containerização:** Docker & Docker Compose

---

## Setup e Execução do Projeto

Para rodar este projeto localmente, você precisará ter o **Docker** e o **Docker Compose** instalados em sua máquina.

Siga os passos abaixo:

### 1. Clonar o Repositório

Se você ainda não o fez, clone o projeto para a sua máquina local.

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd prontuario
```

### 2. Configurar Variáveis de Ambiente

O backend precisa de um arquivo `.env.dev` para configurar a conexão com o banco de dados. O projeto já inclui uma configuração padrão que funciona com o `docker-compose.yml`. Certifique-se de que o arquivo `backend/.env.dev` existe com o seguinte conteúdo:

```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=prontuario
DB_USER=user
DB_PASSWORD=password
DB_HOST=db
DB_PORT=5432
DEBUG=1
SECRET_KEY='django-insecure-voce-pode-trocar-essa-chave-depois'
ALLOWED_HOSTS='*'
```
> **Nota:** Para um ambiente de produção, é crucial gerar uma `SECRET_KEY` segura e configurar os `ALLOWED_HOSTS` de forma restritiva.

### 3. Construir e Iniciar os Containers

Com o Docker em execução, utilize o Docker Compose para construir as imagens e iniciar todos os serviços (backend, frontend e banco de dados).

Execute o seguinte comando na raiz do projeto:

```bash
docker compose up --build -d
```
*   O comando irá baixar as imagens base, instalar as dependências e iniciar os três containers em modo "detached" (`-d`).
*   O backend estará disponível em `http://localhost:8000`.
*   O frontend estará disponível em `http://localhost:5173`.

### 4. Acessar a Aplicação

Abra seu navegador e acesse `http://localhost:5173` para começar a usar o sistema.

*   **Primeiro acesso:**
    1.  Clique em "Cadastre-se como médico" para criar sua conta de médico.
    2.  Após o cadastro, faça o login com as credenciais que você acabou de criar.
    3.  Você será redirecionado para a lista de pacientes, onde poderá começar a adicionar e gerenciar seus pacientes.

### 5. Parar a Aplicação

Para parar todos os containers, execute o comando abaixo na raiz do projeto:

```bash
docker compose down
```

Se você também desejar remover os volumes (o que apagará permanentemente os dados do banco de dados), execute:

```bash
docker compose down -v
```

---

## Funcionalidade de Assinatura Digital (Certificado A3)

O sistema implementa um fluxo de assinatura digital para receitas e procedimentos em conformidade com os padrões da ICP-Brasil, permitindo que médicos utilizem seus certificados digitais A3 (em token ou smart card) para assinar documentos com validade jurídica.

### Requisitos Funcionais

1.  **Geração de PDF:** O médico pode gerar uma versão PDF de qualquer receita ou procedimento diretamente do sistema.
2.  **Assinatura Externa:** O sistema é projetado para integração com assinadores de mercado, como o **Assinador ITI** (ferramenta oficial do Governo Federal) ou o Shodô. O médico baixa o PDF, assina-o usando seu software local e o certificado A3.
3.  **Upload de Documento Assinado:** O médico faz o upload do PDF assinado de volta para a plataforma.
4.  **Verificação Criptográfica:** O sistema automaticamente verifica a integridade do arquivo e a validade da assinatura digital contida no PDF. Se a assinatura for inválida ou o documento tiver sido alterado, o upload é rejeitado.
5.  **Armazenamento Seguro:** Uma vez validado, o documento assinado é armazenado de forma segura e associado ao prontuário do paciente.
6.  **Guia do Usuário:** Para facilitar o processo, uma janela de instruções (modal) é exibida para o médico assim que ele baixa um PDF, guiando-o pelas etapas da assinatura externa.
7.  **Download do Documento Final:** Após a assinatura, o documento final com validade jurídica fica disponível para download.

### Requisitos Não Funcionais

1.  **Segurança:** A validação da assinatura é feita no backend, garantindo que nenhum documento inválido ou não assinado seja aceito. A verificação criptográfica garante a autenticidade e a integridade do documento.
2.  **Conformidade:** Ao utilizar um fluxo que depende de assinadores externos reconhecidos pelo ITI, garantimos a conformidade com a legislação brasileira sobre documentos eletrônicos.
3.  **Usabilidade:** Apesar da necessidade de um fluxo externo, a interface foi projetada para ser clara, com botões distintos para cada ação e um guia de instruções para minimizar a chance de erro do usuário.

### Requisitos Técnicos

1.  **Backend:**
    *   **Linguagem:** Python / Django REST Framework.
    *   **Bibliotecas Criptográficas:**
        *   `endesive` e `pyopenssl`: Para a análise e verificação de assinaturas digitais dentro de arquivos PDF.
        *   `cryptography`: Base para operações criptográficas.
    *   **Armazenamento de Arquivos:** O Django está configurado com `MEDIA_ROOT` e `MEDIA_URL` para gerenciar o armazenamento de arquivos enviados pelos usuários.
2.  **Frontend:**
    *   **Framework:** React.js.
    *   **Upload de Arquivos:** A interface utiliza `FormData` para enviar o arquivo PDF assinado para a API do backend de forma assíncrona.
    *   **Componente de Instruções:** Um modal desenvolvido com Material-UI (`@mui/material`) é usado para guiar o usuário.

