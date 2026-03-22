const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pisom_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('pisom_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pisom_token');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Não autorizado');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(error.message || `Erro ${res.status}`);
    }

    return res.json();
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: any) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body?: any) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // Auth
  login(email: string, password: string) {
    return this.post<{ token: string; user: any; organization: any }>('/auth/login', { email, password });
  }

  register(data: { email: string; password: string; firstName: string; lastName: string; organizationName?: string }) {
    return this.post<{ token: string; user: any; organization: any }>('/auth/register', data);
  }

  // Users
  getMe() {
    return this.get<any>('/users/me');
  }

  getTeam() {
    return this.get<any[]>('/users/team');
  }

  // Pipelines
  getPipelines() {
    return this.get<any[]>('/pipelines');
  }

  getDefaultPipeline() {
    return this.get<any>('/pipelines/default');
  }

  // Deals
  getDeals(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<any[]>(`/deals${query}`);
  }

  getDealKanban(pipelineId: string) {
    return this.get<any>(`/deals/kanban/${pipelineId}`);
  }

  getDeal(id: string) {
    return this.get<any>(`/deals/${id}`);
  }

  createDeal(data: any) {
    return this.post<any>('/deals', data);
  }

  updateDeal(id: string, data: any) {
    return this.patch<any>(`/deals/${id}`, data);
  }

  moveDeal(id: string, stageId: string, position?: number) {
    return this.patch<any>(`/deals/${id}/move`, { stageId, position });
  }

  markDealWon(id: string, reason?: string) {
    return this.patch<any>(`/deals/${id}/won`, { reason });
  }

  markDealLost(id: string, reason?: string) {
    return this.patch<any>(`/deals/${id}/lost`, { reason });
  }

  getDealsSummary(pipelineId?: string) {
    const query = pipelineId ? `?pipelineId=${pipelineId}` : '';
    return this.get<any>(`/deals/summary${query}`);
  }

  // Leads
  getLeads(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<any>(`/leads${query}`);
  }

  getLead(id: string) {
    return this.get<any>(`/leads/${id}`);
  }

  createLead(data: any) {
    return this.post<any>('/leads', data);
  }

  updateLead(id: string, data: any) {
    return this.patch<any>(`/leads/${id}`, data);
  }

  // Contacts
  getContacts(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.get<any[]>(`/contacts${query}`);
  }

  createContact(data: any) {
    return this.post<any>('/contacts', data);
  }

  getContact(id: string) {
    return this.get<any>(`/contacts/${id}`);
  }

  updateContact(id: string, data: any) {
    return this.patch<any>(`/contacts/${id}`, data);
  }

  // Companies
  getCompanies(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.get<any[]>(`/companies${query}`);
  }

  createCompany(data: any) {
    return this.post<any>('/companies', data);
  }

  getCompany(id: string) {
    return this.get<any>(`/companies/${id}`);
  }

  updateCompany(id: string, data: any) {
    return this.patch<any>(`/companies/${id}`, data);
  }

  // Tasks
  getTasks(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<any[]>(`/tasks${query}`);
  }

  getMyTasks() {
    return this.get<any[]>('/tasks/my');
  }

  createTask(data: any) {
    return this.post<any>('/tasks', data);
  }

  updateTaskStatus(id: string, status: string) {
    return this.patch<any>(`/tasks/${id}/status`, { status });
  }

  // Onboarding
  getOnboardings(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<any[]>(`/onboarding${query}`);
  }

  getOnboarding(id: string) {
    return this.get<any>(`/onboarding/${id}`);
  }

  createOnboarding(data: any) {
    return this.post<any>('/onboarding', data);
  }

  updateOnboarding(id: string, data: any) {
    return this.patch<any>(`/onboarding/${id}`, data);
  }

  updateOnboardingItem(onboardingId: string, itemId: string, data: any) {
    return this.patch<any>(`/onboarding/${onboardingId}/items/${itemId}`, data);
  }

  addOnboardingSection(onboardingId: string, data: any) {
    return this.post<any>(`/onboarding/${onboardingId}/sections`, data);
  }

  acceptOnboardingTerms(id: string) {
    return this.patch<any>(`/onboarding/${id}/accept-terms`, {});
  }

  getOnboardingSummary() {
    return this.get<any>('/onboarding/summary');
  }

  // Onboarding Templates
  getOnboardingTemplates(serviceType?: string) {
    const query = serviceType ? `?serviceType=${serviceType}` : '';
    return this.get<any[]>(`/onboarding-templates${query}`);
  }

  createOnboardingTemplate(data: any) {
    return this.post<any>('/onboarding-templates', data);
  }

  seedDefaultTemplates() {
    return this.post<any>('/onboarding-templates/seed-defaults');
  }

  // Financial: Contracts
  getContracts(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<any[]>(`/financial/contracts${query}`);
  }

  getContract(id: string) {
    return this.get<any>(`/financial/contracts/${id}`);
  }

  createContract(data: any) {
    return this.post<any>('/financial/contracts', data);
  }

  updateContract(id: string, data: any) {
    return this.patch<any>(`/financial/contracts/${id}`, data);
  }

  cancelContract(id: string, reason?: string) {
    return this.patch<any>(`/financial/contracts/${id}/cancel`, { reason });
  }

  deleteContract(id: string) {
    return this.delete<any>(`/financial/contracts/${id}`);
  }

  getMRR() {
    return this.get<any>('/financial/contracts/mrr');
  }

  // Financial: Invoices
  getInvoices(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<any>(`/financial/invoices${query}`);
  }

  getInvoice(id: string) {
    return this.get<any>(`/financial/invoices/${id}`);
  }

  createInvoice(data: any) {
    return this.post<any>('/financial/invoices', data);
  }

  updateInvoice(id: string, data: any) {
    return this.patch<any>(`/financial/invoices/${id}`, data);
  }

  markInvoicePaid(id: string, data?: any) {
    return this.patch<any>(`/financial/invoices/${id}/pay`, data || {});
  }

  markInvoiceSent(id: string) {
    return this.patch<any>(`/financial/invoices/${id}/send`, {});
  }

  cancelInvoice(id: string) {
    return this.patch<any>(`/financial/invoices/${id}/cancel`, {});
  }

  deleteInvoice(id: string) {
    return this.delete<any>(`/financial/invoices/${id}`);
  }

  getInvoiceSummary(month?: string) {
    const query = month ? `?month=${month}` : '';
    return this.get<any>(`/financial/invoices/summary${query}`);
  }

  generateInvoices() {
    return this.post<any>('/financial/invoices/generate');
  }

  // Financial: Expenses
  getExpenses(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<any>(`/financial/expenses${query}`);
  }

  createExpense(data: any) {
    return this.post<any>('/financial/expenses', data);
  }

  updateExpense(id: string, data: any) {
    return this.patch<any>(`/financial/expenses/${id}`, data);
  }

  approveExpense(id: string) {
    return this.patch<any>(`/financial/expenses/${id}/approve`, {});
  }

  payExpense(id: string) {
    return this.patch<any>(`/financial/expenses/${id}/pay`, {});
  }

  rejectExpense(id: string) {
    return this.patch<any>(`/financial/expenses/${id}/reject`, {});
  }

  deleteExpense(id: string) {
    return this.delete<any>(`/financial/expenses/${id}`);
  }

  getExpenseSummary(month?: string) {
    const query = month ? `?month=${month}` : '';
    return this.get<any>(`/financial/expenses/summary${query}`);
  }

  getExpenseCategories() {
    return this.get<any[]>('/financial/expenses/categories');
  }

  createExpenseCategory(data: any) {
    return this.post<any>('/financial/expenses/categories', data);
  }

  getCostCenters() {
    return this.get<any[]>('/financial/expenses/cost-centers');
  }

  createCostCenter(data: any) {
    return this.post<any>('/financial/expenses/cost-centers', data);
  }

  // Financial: Cashflow & DRE
  getCashflowRealized(months?: number) {
    const query = months ? `?months=${months}` : '';
    return this.get<any[]>(`/financial/cashflow/realized${query}`);
  }

  getCashflowProjected(months?: number) {
    const query = months ? `?months=${months}` : '';
    return this.get<any[]>(`/financial/cashflow/projected${query}`);
  }

  getDRE(month?: string) {
    const query = month ? `?month=${month}` : '';
    return this.get<any>(`/financial/cashflow/dre${query}`);
  }

  getClientProfitability(month?: string) {
    const query = month ? `?month=${month}` : '';
    return this.get<any[]>(`/financial/cashflow/client-profitability${query}`);
  }

  // Content: Posts
  getContentPosts(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<any>(`/content/posts${query}`);
  }

  getContentPostSummary() {
    return this.get<any>('/content/posts/summary');
  }

  getContentCalendar(month?: string) {
    const query = month ? `?month=${month}` : '';
    return this.get<any[]>(`/content/posts/calendar${query}`);
  }

  getContentPost(id: string) {
    return this.get<any>(`/content/posts/${id}`);
  }

  createContentPost(data: any) {
    return this.post<any>('/content/posts', data);
  }

  updateContentPost(id: string, data: any) {
    return this.request<any>(`/content/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  updateContentPostStatus(id: string, status: string, rejectionReason?: string) {
    return this.patch<any>(`/content/posts/${id}/status`, { status, rejectionReason });
  }

  deleteContentPost(id: string) {
    return this.delete<any>(`/content/posts/${id}`);
  }

  createContentVersion(postId: string, data: any) {
    return this.post<any>(`/content/posts/${postId}/versions`, data);
  }

  // Content: Ideas
  getContentIdeas(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<any>(`/content/ideas${query}`);
  }

  createContentIdea(data: any) {
    return this.post<any>('/content/ideas', data);
  }

  updateContentIdeaStatus(id: string, status: string) {
    return this.patch<any>(`/content/ideas/${id}/status`, { status });
  }

  deleteContentIdea(id: string) {
    return this.delete<any>(`/content/ideas/${id}`);
  }

  // Content: Profiles
  getContentProfiles() {
    return this.get<any[]>('/content/profiles');
  }

  getContentProfile(id: string) {
    return this.get<any>(`/content/profiles/${id}`);
  }

  createContentProfile(data: any) {
    return this.post<any>('/content/profiles', data);
  }

  updateContentProfile(id: string, data: any) {
    return this.request<any>(`/content/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  deleteContentProfile(id: string) {
    return this.delete<any>(`/content/profiles/${id}`);
  }

  // Settings
  updateMe(data: any) {
    return this.patch<any>('/users/me', data);
  }

  updateOrganization(data: any) {
    return this.patch<any>('/organizations/me', data);
  }

  resetOrganizationData(options: {
    financial: boolean;
    crm: boolean;
    pipeline: boolean;
    tasks: boolean;
    onboarding: boolean;
    content: boolean;
    categories: boolean;
    tags: boolean;
  }) {
    return this.post<{ message: string; deleted: Record<string, number> }>('/organizations/reset', options);
  }

  inviteMember(data: any) {
    return this.post<any>('/users/invite', data);
  }

  updateMemberRole(memberId: string, role: string) {
    return this.patch<any>(`/users/team/${memberId}/role`, { role });
  }

  removeMember(memberId: string) {
    return this.delete<any>(`/users/team/${memberId}`);
  }

  // Integrations
  getAsaasIntegration() {
    return this.get<any>('/integrations/asaas');
  }

  saveAsaasIntegration(data: { apiKey: string; sandbox: boolean }) {
    return this.post<any>('/integrations/asaas', data);
  }

  testAsaasConnection() {
    return this.post<{ success: boolean; message: string }>('/integrations/asaas/test');
  }

  triggerAsaasSync() {
    return this.post<{ message: string }>('/integrations/asaas/sync');
  }

  cancelAsaasSync() {
    return this.post<{ message: string }>('/integrations/asaas/sync/cancel');
  }

  getAsaasSyncStatus() {
    return this.get<{
      syncStatus: string | null;
      lastSyncAt: string | null;
      syncError: string | null;
      syncProgress: number | null;
      syncPhase: string | null;
      syncDetail: string | null;
    }>('/integrations/asaas/status');
  }

  deleteAsaasIntegration() {
    return this.delete<any>('/integrations/asaas');
  }

  // Bank Accounts
  getAccounts() {
    return this.get<any>('/financial/accounts');
  }

  getAccountsSummary() {
    return this.get<any>('/financial/accounts/summary');
  }

  getAccount(id: string) {
    return this.get<any>(`/financial/accounts/${id}`);
  }

  createAccount(data: any) {
    return this.post<any>('/financial/accounts', data);
  }

  updateAccount(id: string, data: any) {
    return this.patch<any>(`/financial/accounts/${id}`, data);
  }

  deleteAccount(id: string) {
    return this.delete<any>(`/financial/accounts/${id}`);
  }
}

export const api = new ApiClient();
