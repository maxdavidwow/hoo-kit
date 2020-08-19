import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskInstancesComponent } from './task-instances.component';

describe('TaskInstancesComponent', () => {
  let component: TaskInstancesComponent;
  let fixture: ComponentFixture<TaskInstancesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TaskInstancesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskInstancesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
