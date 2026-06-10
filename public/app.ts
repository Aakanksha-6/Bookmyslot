interface BookingEntry {
  slotId: string;
  labName: string;
  date: string;
  time: string;
  rollNumber: string;
  studentName: string;
  bookedAt: string;
}

interface Slot {
  _id: string;
  labName: string;
  date: string;
  time: string;
  totalSeats: number;
  bookedCount: number;
  availableSeats: number;
  isAvailable: boolean;
  bookings: Array<{ rollNumber: string; studentName: string; bookedAt: string }>;
}

class ApiService {
  static $inject = ['$http'];
  constructor(private $http: angular.IHttpService) {}

  getSlots() {
    return this.$http.get<Slot[]>('/slots');
  }

  createSlot(slot: { labName: string; date: string; time: string; totalSeats: number }) {
    return this.$http.post<Slot>('/slot', slot);
  }

  bookSlot(slotId: string, rollNumber: string, studentName: string) {
    return this.$http.post<Slot>('/book', { slotId, rollNumber, studentName });
  }

  cancelBooking(slotId: string, rollNumber: string) {
    return this.$http.post<Slot>('/cancel', { slotId, rollNumber });
  }

  getBookings(rollNumber: string) {
    const params: any = {};
    if (rollNumber) {
      params.rollNumber = rollNumber;
    }
    return this.$http.get<BookingEntry[]>('/bookings', { params });
  }
}

class AvailableController {
  static $inject = ['apiService'];
  slots: Slot[] = [];
  booking = { rollNumber: '', studentName: '' };
  slotMessage: Record<string, { type: string; text: string }> = {};

  constructor(private apiService: ApiService) {
    this.refreshSlots();
  }

  refreshSlots() {
    this.apiService.getSlots().then(response => {
      this.slots = response.data;
    });
  }

  book(slot: Slot) {
    if (!this.booking.rollNumber || !this.booking.studentName) {
      this.slotMessage[slot._id] = { type: 'error', text: 'Enter roll number and student name.' };
      return;
    }

    this.apiService.bookSlot(slot._id, this.booking.rollNumber, this.booking.studentName)
      .then(() => {
        this.slotMessage[slot._id] = { type: 'success', text: 'Booked successfully.' };
        this.booking = { rollNumber: '', studentName: '' };
        this.refreshSlots();
      })
      .catch(err => {
        const message = err.data?.error || 'Booking failed.';
        this.slotMessage[slot._id] = { type: 'error', text: message };
      });
  }
}

class MyBookingsController {
  static $inject = ['apiService'];
  filterRoll = '';
  bookings: BookingEntry[] = [];
  message = { type: '', text: '' };

  constructor(private apiService: ApiService) {}

  loadBookings() {
    if (!this.filterRoll) {
      this.message = { type: 'error', text: 'Enter a roll number to search.' };
      return;
    }

    this.apiService.getBookings(this.filterRoll)
      .then(response => {
        this.bookings = response.data;
        if (this.bookings.length === 0) {
          this.message = { type: 'error', text: 'No bookings found for this roll number.' };
        } else {
          this.message = { type: 'success', text: 'Bookings loaded.' };
        }
      })
      .catch(() => {
        this.message = { type: 'error', text: 'Unable to fetch bookings.' };
      });
  }

  cancel(booking: BookingEntry) {
    this.apiService.cancelBooking(booking.slotId, booking.rollNumber)
      .then(() => {
        this.message = { type: 'success', text: 'Booking canceled successfully.' };
        this.loadBookings();
      })
      .catch(err => {
        const message = err.data?.error || 'Cancel failed.';
        this.message = { type: 'error', text: message };
      });
  }
}

class AdminController {
  static $inject = ['apiService'];
  newSlot = { labName: '', date: '', time: '', totalSeats: 1 };
  bookings: BookingEntry[] = [];
  adminMessage = { type: '', text: '' };

  constructor(private apiService: ApiService) {
    this.loadBookings();
  }

  addSlot() {
    if (!this.newSlot.labName || !this.newSlot.date || !this.newSlot.time || this.newSlot.totalSeats < 1) {
      this.adminMessage = { type: 'error', text: 'Complete the form to add a new slot.' };
      return;
    }

    this.apiService.createSlot(this.newSlot)
      .then(() => {
        this.adminMessage = { type: 'success', text: 'Slot created successfully.' };
        this.newSlot = { labName: '', date: '', time: '', totalSeats: 1 };
      })
      .catch(err => {
        const message = err.data?.error || 'Unable to create slot.';
        this.adminMessage = { type: 'error', text: message };
      });
  }

  loadBookings() {
    this.apiService.getBookings('')
      .then(response => {
        this.bookings = response.data;
      });
  }
}

angular.module('bookMySlot', ['ngRoute'])
  .service('apiService', ApiService)
  .config(['$routeProvider', ($routeProvider: angular.route.IRouteProvider) => {
    $routeProvider
      .when('/available', {
        templateUrl: 'available.html',
        controller: AvailableController,
        controllerAs: 'vm'
      })
      .when('/bookings', {
        templateUrl: 'bookings.html',
        controller: MyBookingsController,
        controllerAs: 'vm'
      })
      .when('/admin', {
        templateUrl: 'admin.html',
        controller: AdminController,
        controllerAs: 'vm'
      })
      .otherwise({ redirectTo: '/available' });
  }]);
