#!/bin/bash
set -e

# ─── Pisom OS - Script de Deploy ───────────────────────────────────
# Uso: ./deploy.sh [init|ssl|update|logs|restart]

DOMAIN="sistema.pisommidias.com.br"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[Pisom OS]${NC} $1"; }
warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

# Verifica se .env existe
check_env() {
    if [ ! -f .env ]; then
        error "Arquivo .env não encontrado! Copie .env.example para .env e preencha os valores."
    fi
    source .env
    if [ "$DB_PASSWORD" = "SuaSenhaSeguraAqui123!" ] || [ -z "$DB_PASSWORD" ]; then
        warn "Troque DB_PASSWORD no .env antes de ir para produção!"
    fi
    if [ "$JWT_SECRET" = "troque-por-uma-chave-segura-com-pelo-menos-64-caracteres-aqui!!" ] || [ -z "$JWT_SECRET" ]; then
        warn "Troque JWT_SECRET no .env antes de ir para produção!"
    fi
}

# Primeira instalação
init() {
    log "Iniciando deploy do Pisom OS..."
    check_env
    source .env

    # Usa config sem SSL primeiro
    log "Usando configuração HTTP inicial..."
    cp nginx/nginx-initial.conf nginx/nginx.conf.bak
    cp nginx/nginx-initial.conf nginx/nginx-active.conf

    # Build e start
    log "Construindo containers..."
    docker compose build

    log "Iniciando serviços..."
    docker compose up -d db
    sleep 5

    log "Rodando migrations do Prisma..."
    docker compose run --rm api npx prisma db push --accept-data-loss

    log "Subindo todos os serviços..."
    docker compose up -d

    log "Aguardando serviços ficarem prontos..."
    sleep 10

    log "✓ Sistema rodando em http://${DOMAIN}"
    log ""
    log "Próximo passo: rode './deploy.sh ssl' para configurar HTTPS"
}

# Configura SSL com Let's Encrypt
ssl() {
    check_env
    source .env

    CERTBOT_EMAIL=${CERTBOT_EMAIL:-admin@pisommidias.com.br}

    log "Obtendo certificado SSL para ${DOMAIN}..."

    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"

    if [ $? -eq 0 ]; then
        log "Certificado obtido! Ativando configuração HTTPS..."
        cp nginx/nginx.conf nginx/nginx-active.conf
        docker compose restart nginx
        log "✓ HTTPS ativo em https://${DOMAIN}"
    else
        error "Falha ao obter certificado. Verifique se o DNS aponta para este servidor."
    fi
}

# Atualiza o sistema (após git pull)
update() {
    log "Atualizando Pisom OS..."
    check_env

    log "Reconstruindo containers..."
    docker compose build

    log "Rodando migrations..."
    docker compose run --rm api npx prisma db push --accept-data-loss

    log "Reiniciando serviços..."
    docker compose up -d

    log "✓ Atualização concluída!"
}

# Logs
logs() {
    SERVICE=${2:-""}
    if [ -z "$SERVICE" ]; then
        docker compose logs -f --tail=50
    else
        docker compose logs -f --tail=50 "$SERVICE"
    fi
}

# Restart
restart() {
    log "Reiniciando serviços..."
    docker compose restart
    log "✓ Serviços reiniciados!"
}

# Menu
case "${1}" in
    init)
        init
        ;;
    ssl)
        ssl
        ;;
    update)
        update
        ;;
    logs)
        logs "$@"
        ;;
    restart)
        restart
        ;;
    *)
        echo ""
        echo "  Pisom OS - Deploy Script"
        echo "  ────────────────────────"
        echo ""
        echo "  Uso: ./deploy.sh <comando>"
        echo ""
        echo "  Comandos:"
        echo "    init      Primeira instalação (build + start + migration)"
        echo "    ssl       Configurar HTTPS com Let's Encrypt"
        echo "    update    Atualizar sistema (rebuild + migration + restart)"
        echo "    logs      Ver logs (ex: ./deploy.sh logs api)"
        echo "    restart   Reiniciar todos os serviços"
        echo ""
        ;;
esac
