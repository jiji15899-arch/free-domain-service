#!/bin/bash

# FreeDomain Platform - 배포 자동화 스크립트
# 사용법: chmod +x deploy.sh && ./deploy.sh

set -e

echo "🚀 FreeDomain Platform 배포 스크립트"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 함수: 성공 메시지
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 함수: 에러 메시지
error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# 함수: 경고 메시지
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 1. Git 확인
echo "1. Git 설치 확인..."
if ! command -v git &> /dev/null; then
    error "Git이 설치되어 있지 않습니다. https://git-scm.com/downloads"
fi
success "Git 설치 확인 완료"
echo ""

# 2. 필수 파일 확인
echo "2. 필수 파일 확인..."
required_files=("index.html" "register.html" "manage.html" "admin.html" "styles.css" "app.js" "README.md")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        error "$file 파일이 없습니다."
    fi
done
success "모든 필수 파일 존재 확인"
echo ""

# 3. Git 저장소 초기화 또는 확인
echo "3. Git 저장소 설정..."
if [ ! -d ".git" ]; then
    echo "Git 저장소가 초기화되지 않았습니다."
    read -p "새 Git 저장소를 초기화하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git init
        success "Git 저장소 초기화 완료"
    else
        error "Git 저장소가 필요합니다."
    fi
else
    success "Git 저장소 확인 완료"
fi
echo ""

# 4. GitHub 원격 저장소 설정
echo "4. GitHub 원격 저장소 설정..."
if ! git remote | grep -q "origin"; then
    warning "원격 저장소가 설정되지 않았습니다."
    echo ""
    echo "GitHub에서 새 저장소를 생성하고 URL을 입력하세요."
    echo "예: https://github.com/username/freedomain.git"
    read -p "GitHub 저장소 URL: " repo_url
    
    if [ -z "$repo_url" ]; then
        error "저장소 URL을 입력해야 합니다."
    fi
    
    git remote add origin "$repo_url"
    success "원격 저장소 추가 완료"
else
    success "원격 저장소 확인 완료"
    git remote -v
fi
echo ""

# 5. .gitignore 생성
echo "5. .gitignore 파일 생성..."
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << EOF
# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# Backup
*.bak
*.backup

# Logs
*.log
EOF
    success ".gitignore 생성 완료"
else
    success ".gitignore 이미 존재"
fi
echo ""

# 6. README.md 업데이트 확인
echo "6. README.md 확인..."
if [ -f "README.md" ]; then
    success "README.md 존재 확인"
else
    warning "README.md가 없습니다. 생성하는 것을 권장합니다."
fi
echo ""

# 7. 파일 추가 및 커밋
echo "7. 파일 커밋 준비..."
git add .

if git diff --cached --quiet; then
    warning "변경사항이 없습니다."
else
    echo "커밋 메시지를 입력하세요 (기본: Initial commit):"
    read -p "커밋 메시지: " commit_message
    commit_message=${commit_message:-"Initial commit"}
    
    git commit -m "$commit_message"
    success "커밋 완료"
fi
echo ""

# 8. 브랜치 확인 및 변경
echo "8. 브랜치 확인..."
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
    warning "현재 브랜치: $current_branch"
    read -p "main 브랜치로 변경하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -M main
        success "main 브랜치로 변경 완료"
    fi
else
    success "브랜치 확인 완료: $current_branch"
fi
echo ""

# 9. GitHub에 푸시
echo "9. GitHub에 푸시..."
read -p "GitHub에 푸시하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    git push -u origin $current_branch
    success "GitHub 푸시 완료"
else
    warning "푸시를 건너뛰었습니다."
fi
echo ""

# 10. GitHub Pages 설정 안내
echo "======================================"
echo ""
success "배포 준비 완료! 🎉"
echo ""
echo "다음 단계:"
echo "1. GitHub 저장소 페이지로 이동"
echo "2. Settings 탭 클릭"
echo "3. 왼쪽 메뉴에서 'Pages' 클릭"
echo "4. Source 섹션에서:"
echo "   - Branch: main (또는 master) 선택"
echo "   - Folder: / (root) 선택"
echo "5. Save 버튼 클릭"
echo "6. 약 1-2분 대기"
echo "7. 페이지 상단에 URL 표시됨"
echo ""
echo "Cloudflare Pages 사용 시:"
echo "1. https://dash.cloudflare.com 접속"
echo "2. Workers & Pages → Create application"
echo "3. Pages → Connect to Git"
echo "4. 저장소 선택 및 배포"
echo ""
success "모든 파일이 준비되었습니다!"
echo ""

# GitHub 저장소 URL 표시
origin_url=$(git config --get remote.origin.url)
if [ ! -z "$origin_url" ]; then
    echo "GitHub 저장소: $origin_url"
    
    # URL에서 사용자명과 저장소명 추출
    if [[ $origin_url =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
        username="${BASH_REMATCH[1]}"
        reponame="${BASH_REMATCH[2]}"
        echo "예상 GitHub Pages URL: https://${username}.github.io/${reponame}/"
    fi
fi
echo ""
echo "======================================"
