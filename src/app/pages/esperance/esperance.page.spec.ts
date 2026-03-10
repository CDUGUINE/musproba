import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EsperancePage } from './esperance.page';

describe('EsperancePage', () => {
  let component: EsperancePage;
  let fixture: ComponentFixture<EsperancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EsperancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
