// API 엔드포인트 설정 (Cloudflare Worker URL로 변경하세요)
const API_ENDPOINT = 'https://your-worker.workers.dev';

// 도메인 유효성 검사
function validateDomain(domain) {
    const pattern = /^[a-z0-9-]+$/;
    return pattern.test(domain) && domain.length >= 3 && domain.length <= 63;
}

// 이메일 유효성 검사
function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

// 네임서버 유효성 검사
function validateNameserver(ns) {
    const pattern = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
    return pattern.test(ns);
}

// 결과 메시지 표시
function showResult(message, isSuccess) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.className = isSuccess ? 'result success' : 'result error';
    resultDiv.classList.remove('hidden');
    
    // 3초 후 스크롤
    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// 도메인 신청 폼 처리
document.getElementById('domainForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const domainName = document.getElementById('domainName').value.toLowerCase().trim();
    const extension = document.getElementById('domainExtension').value;
    const email = document.getElementById('email').value.trim();
    const ns1 = document.getElementById('ns1').value.trim();
    const ns2 = document.getElementById('ns2').value.trim();
    const agree = document.getElementById('agree').checked;
    
    // 유효성 검사
    if (!validateDomain(domainName)) {
        showResult('도메인 이름은 3-63자의 영문 소문자, 숫자, 하이픈만 사용 가능합니다.', false);
        return;
    }
    
    if (!validateEmail(email)) {
        showResult('올바른 이메일 주소를 입력해주세요.', false);
        return;
    }
    
    if (!validateNameserver(ns1) || !validateNameserver(ns2)) {
        showResult('올바른 네임서버 주소를 입력해주세요.', false);
        return;
    }
    
    if (!agree) {
        showResult('이용약관에 동의해주세요.', false);
        return;
    }
    
    const fullDomain = domainName + extension;
    
    // 버튼 비활성화
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';
    
    try {
        // API 호출
        const response = await fetch(`${API_ENDPOINT}/domain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain: fullDomain,
                email: email,
                nameservers: [ns1, ns2]
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showResult(
                `✅ 도메인 "${fullDomain}"이(가) 성공적으로 등록되었습니다!\n` +
                `네임서버가 전파되는데 최대 24-48시간이 걸릴 수 있습니다.\n` +
                `이메일로 등록 확인 메일이 발송되었습니다.`,
                true
            );
            
            // 폼 초기화
            e.target.reset();
        } else {
            showResult(data.message || '도메인 등록에 실패했습니다. 다시 시도해주세요.', false);
        }
    } catch (error) {
        console.error('Error:', error);
        showResult('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '도메인 신청하기';
    }
});

// 도메인 이름 입력 시 자동 소문자 변환
document.getElementById('domainName').addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
});
