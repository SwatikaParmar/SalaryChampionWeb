import { of, Subject } from 'rxjs';
import { LoanApplicationHomeComponent } from './loan-application-home.component';

describe('LoanApplicationHomeComponent', () => {
  const firstVisitHardRefreshStorageKey =
    'loanApplicationHome.firstVisitHardRefreshDone';

  let contentService: any;
  let router: any;
  let spinner: any;

  const createComponent = () => {
    const queryParams$ = new Subject<any>();
    const component = new LoanApplicationHomeComponent(
      contentService,
      router,
      spinner,
      { queryParams: queryParams$.asObservable() } as any
    );

    return { component, queryParams$ };
  };

  beforeEach(() => {
    sessionStorage.removeItem(firstVisitHardRefreshStorageKey);

    contentService = {
      getBorrowerSnapshot: jasmine.createSpy('getBorrowerSnapshot').and.returnValue(
        of({
          success: true,
          data: {
            application: { id: 'APP123' },
            applicationFlow: {
              steps: {},
              percent: 0
            }
          }
        })
      ),
      skipFetchBankStatement: jasmine.createSpy('skipFetchBankStatement').and.returnValue(
        of({ success: true })
      )
    };

    router = {
      navigate: jasmine.createSpy('navigate')
    };

    spinner = {
      show: jasmine.createSpy('show'),
      hide: jasmine.createSpy('hide')
    };
  });

  afterEach(() => {
    sessionStorage.removeItem(firstVisitHardRefreshStorageKey);
  });

  it('should create', () => {
    const { component } = createComponent();

    expect(component).toBeTruthy();
  });

  it('should trigger a hard refresh only on the first visit', () => {
    const firstVisit = createComponent();
    const firstVisitReloadSpy = spyOn<any>(
      firstVisit.component,
      'reloadCurrentPage'
    ).and.stub();

    firstVisit.component.ngOnInit();

    expect(firstVisitReloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(firstVisitHardRefreshStorageKey)).toBe('true');
    expect(contentService.getBorrowerSnapshot).not.toHaveBeenCalled();

    const revisit = createComponent();
    const revisitReloadSpy = spyOn<any>(
      revisit.component,
      'reloadCurrentPage'
    ).and.stub();

    revisit.component.ngOnInit();
    revisit.queryParams$.next({});

    expect(revisitReloadSpy).not.toHaveBeenCalled();
    expect(contentService.getBorrowerSnapshot).toHaveBeenCalledTimes(1);
  });
});
