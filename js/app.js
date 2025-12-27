// ⚠️ 여기를 본인의 Worker URL로 변경하세요!
const API_ENDPOINT = 'https://free-domain-services.jiji15899.workers.dev';

// 디버깅: API 엔드포인트 확인
console.log('API Endpoint:', API_ENDPOINT);

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
    
    console.log('Form Data:', { domainName, extension, email, ns1, ns2 });
    
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
    console.log('Full Domain:', fullDomain);
    
    // 버튼 비활성화
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';
    
    try {
        console.log('Sending request to:', `${API_ENDPOINT}/domain`);
        
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
        
        console.log('Response Status:', response.status);
        console.log('Response OK:', response.ok);
        
        let data;
        try {
            data = await response.json();
            console.log('Response Data:', data);
        } catch (jsonError) {
            console.error('JSON Parse Error:', jsonError);
            const text = await response.text();
            console.error('Response Text:', text);
            throw new Error('서버 응답을 파싱할 수 없습니다.');
        }
        
        if (response.ok && data.success) {
            showResult(
                `✅ 도메인 "${fullDomain}"이(가) 성공적으로 등록되었습니다!\n` +
                `네임서버가 전파되는데 최대 24-48시간이 걸릴 수 있습니다.\n` +
                `이메일로 등록 확인 메일이 발송되었습니다.`,
                true
            );
            
            e.target.reset();
        } else {
            showResult(data.message || '도메인 등록에 실패했습니다. 다시 시도해주세요.', false);
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        
        // 구체적인 에러 메시지
        let errorMessage = '서버 연결에 실패했습니다.\n\n';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage += '❌ API 엔드포인트 URL을 확인해주세요.\n';
            errorMessage += `현재 설정: ${API_ENDPOINT}\n\n`;
            errorMessage += '해결 방법:\n';
            errorMessage += '1. js/app.js 파일을 열어주세요\n';
            errorMessage += '2. API_ENDPOINT를 본인의 Worker URL로 변경하세요\n';
            errorMessage += '3. Worker URL은 Cloudflare Workers 페이지에서 확인 가능합니다';
        } else if (error.message.includes('CORS')) {
            errorMessage += '❌ CORS 오류입니다.\n';
            errorMessage += 'Worker 코드에 CORS 헤더가 설정되어 있는지 확인하세요.';
        } else {
            errorMessage += `상세 오류: ${error.message}`;
        }
        
        showResult(errorMessage, false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '도메인 신청하기';
    }
});

// 도메인 이름 입력 시 자동 소문자 변환
document.getElementById('domainName').addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
});

// 페이지 로드 시 테스트
window.addEventListener('load', async () => {
    console.log('=== 시스템 체크 ===');
    console.log('1. API Endpoint:', API_ENDPOINT);
    
    // Worker 연결 테스트
    try {
        console.log('2. Worker 연결 테스트 중...');
        const response = await fetch(`${API_ENDPOINT}/domains?email=test@test.com`);
        console.log('   - Status:', response.status);
        console.log('   - OK:', response.ok);
        
        if (response.ok) {
            console.log('   ✅ Worker 연결 성공!');
        } else {
            console.error('   ❌ Worker 응답 오류');
        }
    } catch (error) {
        console.error('   ❌ Worker 연결 실패:', error.message);
        console.error('   → API_ENDPOINT를 확인하세요!');
    }
    
    console.log('===================');
});
