import { DashboardRefreshService } from './dashboard-refresh.service';

describe('DashboardRefreshService', () => {
  it('should emit refresh requests to subscribers', () => {
    const service = new DashboardRefreshService();
    let emissionCount = 0;

    service.refreshRequests$.subscribe(() => {
      emissionCount += 1;
    });

    service.requestRefresh();
    service.requestRefresh();

    expect(emissionCount).toBe(2);
  });
});
