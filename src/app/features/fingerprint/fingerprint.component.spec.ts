import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FingerprintComponent } from './fingerprint.component';

describe('FingerprintComponent', () => {
  let component: FingerprintComponent;
  let fixture: ComponentFixture<FingerprintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FingerprintComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FingerprintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
