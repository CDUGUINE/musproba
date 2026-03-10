import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JeuHelpPage } from './jeu-help.page';

describe('JeuHelpPage', () => {
  let component: JeuHelpPage;
  let fixture: ComponentFixture<JeuHelpPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JeuHelpPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
