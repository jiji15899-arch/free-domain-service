// 데이터 저장소 초기화
const DB_KEY = 'freedomain_db';
const ADMIN_KEY = 'freedomain_admin';
const CONFIG_KEY = 'freedomain_config';

// 기본 설정
const defaultConfig = {
    extensions: ['.com', '.org', '.net', '.co.kr'],
    defaultNameservers: ['ns1.freedomain.com', 'ns2.freedomain.com'],
    adminPassword: 'admin123',
    allowRegistration: true,
    requireApproval: false
};

// 초기화
function initDB() {
    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(CONFIG_KEY)) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(defaultConfig));
    }
}

// 데이터 가져오기
function getAllDomains() {
    return JSON.parse(localStorage.getItem(DB_KEY) || '[]');
}

// 설정 가져오기
function getConfig() {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || JSON.stringify(defaultConfig));
}

// 설정 저장
function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// 도메인 저장
function saveDomain(domain) {
    const domains = getAllDomains();
    domains.push(domain);
    localStorage.setItem(DB_KEY, JSON.stringify(domains));
}

// 도메인 업데이트
function updateDomain(domainName, updates) {
    const domains = getAllDomains();
    const index = domains.findIndex(d => d.fullDomain === domainName);
    if (index !== -1) {
        domains[index] = { ...domains[index], ...updates };
        localStorage.setItem(DB_KEY, JSON.stringify(domains));
        return true;
    }
    return false;
}

// 도메인 삭제
function deleteDomainByName(domainName) {
    const domains = getAllDomains();
    const filtered = domains.filter(d => d.fullDomain !== domainName);
    localStorage.setItem(DB_KEY, JSON.stringify(filtered));
}

// 도메인 검색 (메인 페이지)
function searchDomain() {
    const name = document.getElementById('domainSearch').value.trim();
    const extension = document.getElementById('extensionSelect').value;
    const resultDiv = document.getElementById('searchResult');

    if (!name) {
        alert('도메인 이름을 입력하세요.');
        return;
    }

    // 유효성 검사
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
        resultDiv.innerHTML = '<p style="color: red;">도메인 이름은 영문, 숫자, 하이픈(-)만 사용 가능합니다.</p>';
        resultDiv.classList.add('show');
        return;
    }

    const fullDomain = name + extension;
    const domains = getAllDomains();
    const exists = domains.some(d => d.fullDomain === fullDomain);

    if (exists) {
        resultDiv.innerHTML = `
            <p style="color: red; font-weight: bold;">❌ ${fullDomain}</p>
            <p>이미 등록된 도메인입니다.</p>
        `;
    } else {
        resultDiv.innerHTML = `
            <p style="color: green; font-weight: bold;">✅ ${fullDomain}</p>
            <p>사용 가능한 도메인입니다!</p>
            <a href="register.html" class="btn-primary" style="display: inline-block; margin-top: 15px; text-decoration: none;">지금 등록하기</a>
        `;
    }
    resultDiv.classList.add('show');
}

// 도메인 사용 가능 여부 확인 (등록 페이지)
function checkAvailability() {
    const name = document.getElementById('domainName').value.trim();
    const extension = document.getElementById('extension').value;
    const resultDiv = document.getElementById('availabilityResult');

    if (!name) {
        alert('도메인 이름을 입력하세요.');
        return;
    }

    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
        resultDiv.innerHTML = '도메인 이름은 영문, 숫자, 하이픈(-)만 사용 가능합니다.';
        resultDiv.className = 'unavailable';
        return;
    }

    const fullDomain = name + extension;
    const domains = getAllDomains();
    const exists = domains.some(d => d.fullDomain === fullDomain);

    if (exists) {
        resultDiv.innerHTML = `❌ ${fullDomain}은(는) 이미 등록되어 있습니다.`;
        resultDiv.className = 'unavailable';
    } else {
        resultDiv.innerHTML = `✅ ${fullDomain}은(는) 사용 가능합니다!`;
        resultDiv.className = 'available';
    }
}

// 도메인 등록
function registerDomain() {
    const name = document.getElementById('domainName').value.trim();
    const extension = document.getElementById('extension').value;
    const email = document.getElementById('ownerEmail').value.trim();
    const ownerName = document.getElementById('ownerName').value.trim();
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const nsOption = document.querySelector('input[name="nsOption"]:checked').value;

    // 유효성 검사
    if (!name || !email || !ownerName) {
        alert('모든 필수 항목을 입력해주세요.');
        return;
    }

    if (!agreeTerms) {
        alert('이용약관에 동의해주세요.');
        return;
    }

    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
        alert('도메인 이름은 영문, 숫자, 하이픈(-)만 사용 가능합니다.');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('올바른 이메일 주소를 입력해주세요.');
        return;
    }

    const fullDomain = name + extension;
    const domains = getAllDomains();

    // 중복 확인
    if (domains.some(d => d.fullDomain === fullDomain)) {
        alert('이미 등록된 도메인입니다.');
        return;
    }

    // 네임서버 설정
    let nameservers;
    if (nsOption === 'custom') {
        const ns1 = document.getElementById('ns1').value.trim();
        const ns2 = document.getElementById('ns2').value.trim();
        const ns3 = document.getElementById('ns3').value.trim();
        const ns4 = document.getElementById('ns4').value.trim();

        if (!ns1 || !ns2) {
            alert('최소 2개의 네임서버를 입력해주세요.');
            return;
        }

        nameservers = [ns1, ns2];
        if (ns3) nameservers.push(ns3);
        if (ns4) nameservers.push(ns4);
    } else {
        const config = getConfig();
        nameservers = config.defaultNameservers;
    }

    // 도메인 객체 생성
    const domain = {
        fullDomain: fullDomain,
        name: name,
        extension: extension,
        owner: {
            email: email,
            name: ownerName
        },
        nameservers: nameservers,
        dnsRecords: [],
        status: 'active',
        registeredDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };

    // 저장
    saveDomain(domain);

    // 결과 표시
    const resultDiv = document.getElementById('registrationResult');
    resultDiv.innerHTML = `
        <h3>✅ 도메인 등록 완료!</h3>
        <p><strong>${fullDomain}</strong>이(가) 성공적으로 등록되었습니다.</p>
        <p><strong>소유자:</strong> ${ownerName} (${email})</p>
        <p><strong>네임서버:</strong></p>
        <ul>
            ${nameservers.map(ns => `<li>${ns}</li>`).join('')}
        </ul>
        <p style="margin-top: 20px;">
            <a href="manage.html" class="btn-primary" style="display: inline-block; text-decoration: none;">도메인 관리하기</a>
        </p>
    `;
    resultDiv.className = 'result-box success show';

    // 폼 초기화
    document.getElementById('domainName').value = '';
    document.getElementById('ownerEmail').value = '';
    document.getElementById('ownerName').value = '';
    document.getElementById('agreeTerms').checked = false;
}

// 내 도메인 조회
function loadMyDomains() {
    const email = document.getElementById('searchEmail').value.trim();
    const listDiv = document.getElementById('domainList');

    if (!email) {
        alert('이메일 주소를 입력하세요.');
        return;
    }

    const domains = getAllDomains();
    const myDomains = domains.filter(d => d.owner.email === email);

    if (myDomains.length === 0) {
        listDiv.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">등록된 도메인이 없습니다.</p>';
        return;
    }

    listDiv.innerHTML = myDomains.map(domain => `
        <div class="domain-card">
            <div>
                <h3>${domain.fullDomain}</h3>
                <p>등록일: ${new Date(domain.registeredDate).toLocaleDateString('ko-KR')}</p>
                <span class="status ${domain.status}">${domain.status === 'active' ? '활성' : '비활성'}</span>
            </div>
            <button class="btn-primary" onclick="openDomainModal('${domain.fullDomain}')">관리</button>
        </div>
    `).join('');
}

// 도메인 상세 모달 열기
function openDomainModal(domainName) {
    const domains = getAllDomains();
    const domain = domains.find(d => d.fullDomain === domainName);

    if (!domain) {
        alert('도메인을 찾을 수 없습니다.');
        return;
    }

    // 현재 관리 중인 도메인 저장
    window.currentDomain = domain;

    // 모달 표시
    const modal = document.getElementById('domainModal');
    document.getElementById('modalDomainName').textContent = domain.fullDomain;
    
    // DNS 레코드 표시
    loadDNSRecords(domain);
    
    // 네임서버 표시
    loadNameservers(domain);
    
    // 도메인 정보 표시
    loadDomainInfo(domain);

    modal.classList.add('show');
}

// 모달 닫기
function closeModal() {
    document.getElementById('domainModal').classList.remove('show');
    window.currentDomain = null;
}

// 탭 전환
function showTab(tabName) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 모든 탭 내용 숨기기
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initDB();
});
// DNS 레코드 로드
function loadDNSRecords(domain) {
    const container = document.getElementById('dnsRecords');
    
    if (!domain.dnsRecords || domain.dnsRecords.length === 0) {
        container.innerHTML = '<p style="color: #666; padding: 20px;">등록된 DNS 레코드가 없습니다.</p>';
        return;
    }

    container.innerHTML = domain.dnsRecords.map((record, index) => `
        <div class="dns-record">
            <div class="dns-record-info">
                <span class="dns-record-type">${record.type}</span>
                <strong>${record.name}</strong> → ${record.value}
                <span style="color: #666; margin-left: 10px;">TTL: ${record.ttl}초</span>
            </div>
            <button class="btn-danger" onclick="deleteDNSRecord(${index})" style="width: auto; margin: 0; padding: 8px 15px;">삭제</button>
        </div>
    `).join('');
}

// DNS 레코드 추가
function addDNSRecord() {
    const type = document.getElementById('recordType').value;
    const name = document.getElementById('recordName').value.trim();
    const value = document.getElementById('recordValue').value.trim();
    const ttl = document.getElementById('recordTTL').value || 3600;

    if (!name || !value) {
        alert('레코드 이름과 값을 모두 입력하세요.');
        return;
    }

    const domain = window.currentDomain;
    if (!domain) {
        alert('도메인 정보를 찾을 수 없습니다.');
        return;
    }

    // DNS 레코드 유효성 검사
    if (type === 'A' && !/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        alert('올바른 IPv4 주소를 입력하세요. (예: 192.168.1.1)');
        return;
    }

    if (type === 'AAAA' && !/^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/.test(value)) {
        alert('올바른 IPv6 주소를 입력하세요.');
        return;
    }

    const record = {
        type: type,
        name: name,
        value: value,
        ttl: parseInt(ttl),
        createdAt: new Date().toISOString()
    };

    if (!domain.dnsRecords) {
        domain.dnsRecords = [];
    }
    domain.dnsRecords.push(record);

    // 업데이트
    updateDomain(domain.fullDomain, { dnsRecords: domain.dnsRecords, lastUpdated: new Date().toISOString() });
    window.currentDomain = domain;

    // 화면 갱신
    loadDNSRecords(domain);

    // 입력 필드 초기화
    document.getElementById('recordName').value = '';
    document.getElementById('recordValue').value = '';
    document.getElementById('recordTTL').value = '3600';

    alert('DNS 레코드가 추가되었습니다.');
}

// DNS 레코드 삭제
function deleteDNSRecord(index) {
    if (!confirm('이 DNS 레코드를 삭제하시겠습니까?')) {
        return;
    }

    const domain = window.currentDomain;
    domain.dnsRecords.splice(index, 1);

    updateDomain(domain.fullDomain, { dnsRecords: domain.dnsRecords, lastUpdated: new Date().toISOString() });
    window.currentDomain = domain;

    loadDNSRecords(domain);
    alert('DNS 레코드가 삭제되었습니다.');
}

// 네임서버 로드
function loadNameservers(domain) {
    const container = document.getElementById('currentNameservers');
    
    container.innerHTML = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h5>현재 네임서버</h5>
            ${domain.nameservers.map((ns, i) => `
                <p style="margin: 5px 0;"><strong>NS${i+1}:</strong> ${ns}</p>
            `).join('')}
        </div>
    `;

    // 현재 네임서버를 입력 필드에 채우기
    domain.nameservers.forEach((ns, i) => {
        const input = document.getElementById(`updateNS${i+1}`);
        if (input) input.value = ns;
    });
}

// 네임서버 업데이트
function updateNameservers() {
    const ns1 = document.getElementById('updateNS1').value.trim();
    const ns2 = document.getElementById('updateNS2').value.trim();
    const ns3 = document.getElementById('updateNS3').value.trim();
    const ns4 = document.getElementById('updateNS4').value.trim();

    if (!ns1 || !ns2) {
        alert('최소 2개의 네임서버를 입력해야 합니다.');
        return;
    }

    // 네임서버 형식 검증
    const nsPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!nsPattern.test(ns1) || !nsPattern.test(ns2)) {
        alert('올바른 네임서버 형식을 입력하세요. (예: ns1.example.com)');
        return;
    }

    const domain = window.currentDomain;
    const nameservers = [ns1, ns2];
    if (ns3 && nsPattern.test(ns3)) nameservers.push(ns3);
    if (ns4 && nsPattern.test(ns4)) nameservers.push(ns4);

    updateDomain(domain.fullDomain, { nameservers: nameservers, lastUpdated: new Date().toISOString() });
    domain.nameservers = nameservers;
    window.currentDomain = domain;

    loadNameservers(domain);
    alert('네임서버가 업데이트되었습니다.');
}

// 도메인 정보 로드
function loadDomainInfo(domain) {
    const container = document.getElementById('domainInfo');
    
    container.innerHTML = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <p><strong>도메인:</strong> ${domain.fullDomain}</p>
            <p><strong>소유자:</strong> ${domain.owner.name}</p>
            <p><strong>이메일:</strong> ${domain.owner.email}</p>
            <p><strong>상태:</strong> <span class="status ${domain.status}">${domain.status === 'active' ? '활성' : '비활성'}</span></p>
            <p><strong>등록일:</strong> ${new Date(domain.registeredDate).toLocaleString('ko-KR')}</p>
            <p><strong>최종 수정일:</strong> ${new Date(domain.lastUpdated).toLocaleString('ko-KR')}</p>
            <p><strong>DNS 레코드 수:</strong> ${domain.dnsRecords ? domain.dnsRecords.length : 0}개</p>
        </div>
    `;
}

// 도메인 삭제
function deleteDomain() {
    const domain = window.currentDomain;
    
    if (!confirm(`정말로 ${domain.fullDomain}을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }

    const confirmText = prompt(`삭제를 확인하려면 "${domain.fullDomain}"을 입력하세요:`);
    
    if (confirmText !== domain.fullDomain) {
        alert('도메인 이름이 일치하지 않습니다.');
        return;
    }

    deleteDomainByName(domain.fullDomain);
    alert('도메인이 삭제되었습니다.');
    closeModal();
    
    // 목록 새로고침
    if (document.getElementById('searchEmail')) {
        loadMyDomains();
    }
}

// === 관리자 기능 ===

// 관리자 로그인
function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    const config = getConfig();

    if (password === config.adminPassword) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadAdminPanel();
    } else {
        alert('비밀번호가 올바르지 않습니다.');
    }
}

// 관리자 패널 로드
function loadAdminPanel() {
    const domains = getAllDomains();
    const today = new Date().toDateString();
    const todayDomains = domains.filter(d => new Date(d.registeredDate).toDateString() === today);

    document.getElementById('totalDomains').textContent = domains.length;
    document.getElementById('todayDomains').textContent = todayDomains.length;
    document.getElementById('activeDomains').textContent = domains.filter(d => d.status === 'active').length;

    // 확장자 목록
    const config = getConfig();
    loadExtensions(config);
    
    // 기본 네임서버
    document.getElementById('defaultNS1').value = config.defaultNameservers[0] || '';
    document.getElementById('defaultNS2').value = config.defaultNameservers[1] || '';
    
    // 시스템 설정
    document.getElementById('allowRegistration').checked = config.allowRegistration;
    document.getElementById('requireApproval').checked = config.requireApproval;
    
    // 전체 도메인 목록
    loadAllDomains();
}

// 확장자 목록 로드
function loadExtensions(config) {
    const container = document.getElementById('extensionList');
    container.innerHTML = config.extensions.map(ext => `
        <span class="extension-tag">
            ${ext}
            <span class="remove" onclick="removeExtension('${ext}')">✕</span>
        </span>
    `).join('');
}

// 확장자 추가
function addExtension() {
    const input = document.getElementById('newExtension');
    let ext = input.value.trim();

    if (!ext) {
        alert('확장자를 입력하세요.');
        return;
    }

    if (!ext.startsWith('.')) {
        ext = '.' + ext;
    }

    if (!/^\.[a-z0-9.-]+$/i.test(ext)) {
        alert('올바른 확장자 형식을 입력하세요. (예: .com, .co.kr)');
        return;
    }

    const config = getConfig();
    
    if (config.extensions.includes(ext)) {
        alert('이미 존재하는 확장자입니다.');
        return;
    }

    config.extensions.push(ext);
    saveConfig(config);
    loadExtensions(config);
    
    input.value = '';
    alert('확장자가 추가되었습니다.');
    
    // 모든 페이지의 select 업데이트 필요
    updateExtensionSelects();
}

// 확장자 제거
function removeExtension(ext) {
    if (!confirm(`${ext} 확장자를 제거하시겠습니까?`)) {
        return;
    }

    const config = getConfig();
    config.extensions = config.extensions.filter(e => e !== ext);
    saveConfig(config);
    loadExtensions(config);
    alert('확장자가 제거되었습니다.');
}

// 확장자 select 업데이트
function updateExtensionSelects() {
    const config = getConfig();
    const selects = document.querySelectorAll('#extensionSelect, #extension');
    
    selects.forEach(select => {
        if (select) {
            select.innerHTML = config.extensions.map(ext => 
                `<option value="${ext}">${ext}</option>`
            ).join('');
        }
    });
}

// 기본 네임서버 업데이트
function updateDefaultNameservers() {
    const ns1 = document.getElementById('defaultNS1').value.trim();
    const ns2 = document.getElementById('defaultNS2').value.trim();

    if (!ns1 || !ns2) {
        alert('네임서버 1과 2는 필수입니다.');
        return;
    }

    const config = getConfig();
    config.defaultNameservers = [ns1, ns2];
    saveConfig(config);
    
    alert('기본 네임서버가 업데이트되었습니다.');
}

// 전체 도메인 목록 로드
function loadAllDomains() {
    const domains = getAllDomains();
    const container = document.getElementById('allDomainsList');

    container.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto; margin-top: 15px;">
            ${domains.map(domain => `
                <div class="domain-card" style="margin-bottom: 15px;">
                    <div>
                        <h4>${domain.fullDomain}</h4>
                        <p>소유자: ${domain.owner.name} (${domain.owner.email})</p>
                        <p>등록일: ${new Date(domain.registeredDate).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <button class="btn-danger" onclick="adminDeleteDomain('${domain.fullDomain}')" style="width: auto; padding: 10px 20px;">삭제</button>
                </div>
            `).join('')}
        </div>
    `;
}

// 도메인 검색 (관리자)
function searchAllDomains() {
    const query = document.getElementById('searchDomain').value.toLowerCase();
    const domains = getAllDomains();
    const filtered = domains.filter(d => 
        d.fullDomain.toLowerCase().includes(query) ||
        d.owner.email.toLowerCase().includes(query) ||
        d.owner.name.toLowerCase().includes(query)
    );

    const container = document.getElementById('allDomainsList');
    container.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto; margin-top: 15px;">
            ${filtered.map(domain => `
                <div class="domain-card" style="margin-bottom: 15px;">
                    <div>
                        <h4>${domain.fullDomain}</h4>
                        <p>소유자: ${domain.owner.name} (${domain.owner.email})</p>
                        <p>등록일: ${new Date(domain.registeredDate).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <button class="btn-danger" onclick="adminDeleteDomain('${domain.fullDomain}')" style="width: auto; padding: 10px 20px;">삭제</button>
                </div>
            `).join('')}
        </div>
    `;
}

// 관리자 도메인 삭제
function adminDeleteDomain(domainName) {
    if (!confirm(`${domainName}을(를) 삭제하시겠습니까?`)) {
        return;
    }

    deleteDomainByName(domainName);
    alert('도메인이 삭제되었습니다.');
    loadAdminPanel();
}

// 시스템 설정 저장
function saveSystemSettings() {
    const config = getConfig();
    config.allowRegistration = document.getElementById('allowRegistration').checked;
    config.requireApproval = document.getElementById('requireApproval').checked;
    
    saveConfig(config);
    alert('시스템 설정이 저장되었습니다.');
}

// 데이터 내보내기
function exportData() {
    const data = {
        domains: getAllDomains(),
        config: getConfig(),
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freedomain_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 데이터 가져오기
function importData() {
    const input = document.getElementById('importFile');
    input.click();
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                
                if (!confirm('기존 데이터를 덮어쓰시겠습니까?')) {
                    return;
                }

                localStorage.setItem(DB_KEY, JSON.stringify(data.domains || []));
                localStorage.setItem(CONFIG_KEY, JSON.stringify(data.config || defaultConfig));
                
                alert('데이터를 가져왔습니다.');
                loadAdminPanel();
            } catch (error) {
                alert('파일을 읽는 중 오류가 발생했습니다.');
            }
        };
        reader.readAsText(file);
    };
                                     }
