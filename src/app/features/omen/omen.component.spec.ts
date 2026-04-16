import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OmenComponent } from './omen.component';

describe('OmenComponent', () => {
  let component: OmenComponent;
  let fixture: ComponentFixture<OmenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OmenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OmenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
