import { TestBed } from '@angular/core/testing';

import { MessagingServiceService } from './messaging-service.service';

describe('MessagingServiceService', () => {
  let service: MessagingServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessagingServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
