import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { TaskInstancesComponent } from './components/task-instances/task-instances.component';
import { EventsComponent } from './components/events/events.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MainViewComponent } from './views/main-view/main-view.component';

import { FormsModule } from '@angular/forms';

import { MaterialModule } from './material.module';

@NgModule({
	declarations: [AppComponent, TasksComponent, TaskInstancesComponent, EventsComponent, MainViewComponent],
	imports: [BrowserModule, FormsModule, MaterialModule, HttpClientModule, AppRoutingModule, BrowserAnimationsModule],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {}
