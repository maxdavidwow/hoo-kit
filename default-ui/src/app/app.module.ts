import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { TaskInstancesComponent } from './components/task-instances/task-instances.component';
import { EventsComponent } from './components/events/events.component';

@NgModule({
	declarations: [AppComponent, TasksComponent, TaskInstancesComponent, EventsComponent],
	imports: [BrowserModule, HttpClientModule, AppRoutingModule],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {}
