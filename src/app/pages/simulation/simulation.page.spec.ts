// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { SimulationPage } from './simulation.page';

// describe('SimulationPage', () => {
//   let component: SimulationPage;
//   let fixture: ComponentFixture<SimulationPage>;

//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [SimulationPage] // ⚠️ important si standalone
//     }).compileComponents();

//     fixture = TestBed.createComponent(SimulationPage);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should reset partnerHasJeu when adv = 0', () => {
//   component.betConfig = {
//     advHasJeu: 1,
//     advHasPairs: 1,
//     partnerHasJeu: true,
//     partnerHasPairs: true,
//     partnerLeqMe: false
//   };

//   component.setAdvJeu(0);

//   expect(component.betConfig.partnerHasJeu).toBeNull();
// });